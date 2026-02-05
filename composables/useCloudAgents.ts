import { computed, watch, ref, type Ref } from 'vue'
import type { CloudAgentDatabaseProvider } from './database/provider'
import { useAgent } from './useAgent'
import type { Item } from './useAgent/types'
import type { CloudAgent } from '../types/agent'

/** Model identifier (e.g. 'gpt-5.2'). Apps can use a stricter union. */
export type ModelType = string

export interface UseCloudAgentsOptions {
  /** Ref or ref-like for current agent ID (e.g. from useStorage). If omitted, a plain ref is used. */
  currentAgentId?: { value: string }
}

/** Sort agents by updatedAt descending (newest first), matching original orderBy(..., 'updatedAt', 'desc'). */
function sortAgentsByUpdated(agents: CloudAgent[]): CloudAgent[] {
  return [...agents].sort((a, b) => {
    const at = a.updatedAt ?? a.createdAt ?? 0
    const bt = b.updatedAt ?? b.createdAt ?? 0
    return bt - at // desc: newer first
  })
}

/**
 * Composable for cloud agent list, current agent, and operations (create, send message, etc.).
 * Uses a database provider for persistence; the provider is bound to the current project by the app.
 */
export function useCloudAgents(
  provider: CloudAgentDatabaseProvider,
  options: UseCloudAgentsOptions = {}
) {
  const { selectedTools, selectedContext } = useAgent()

  const selectedModel = ref<ModelType>('gpt-5.2')
  const setModel = (model: ModelType) => {
    selectedModel.value = model
  }

  const agentsData = provider.getAgents()
  const agents = computed(() => {
    return sortAgentsByUpdated(
      agentsData.value.map((agent) => ({
        ...agent,
        id: agent.id ?? '',
        updatedAt: agent.updatedAt ?? agent.createdAt,
      }))
    )
  })

  const currentAgentId = options.currentAgentId ?? ref<string>('')

  const currentAgent = computed(() => {
    return agents.value.find((item) => item.id === currentAgentId.value)
  })

  watch(currentAgentId, () => {
    if (!currentAgentId.value && agents.value.length > 0) {
      // Agents are sorted newest first, so pick the first (most recent)
      const mostRecent = agents.value[0]
      if (mostRecent?.id) currentAgentId.value = mostRecent.id
    }
  })

  watch(
    currentAgent,
    (newAgent) => {
      if (newAgent?.model) {
        selectedModel.value = newAgent.model
      }
    },
    { immediate: true }
  )

  const loading = computed(() => {
    const status = currentAgent.value?.status
    return status === 'running' || status === 'awaiting_tool'
  })

  const createAgent = async (data?: Partial<Omit<CloudAgent, 'id' | 'projectId'>>) => {
    const id = await provider.createAgent({
      ...data,
      tools: data?.tools ?? [],
      context: data?.context ?? [],
      history: data?.history ?? [],
      status: 'paused',
      model: data?.model ?? selectedModel.value,
    })
    currentAgentId.value = id
    return id
  }

  const forcePause = async (id?: string) => {
    const agentId = id ?? currentAgent.value?.id
    if (!agentId) return
    await provider.updateAgent(agentId, {
      status: 'paused',
      model: selectedModel.value,
    })
  }

  const sendMessage = async (message: string, id?: string) => {
    let agentId = id ?? currentAgent.value?.id
    if (!agentId) {
      agentId = await createAgent({
        model: selectedModel.value,
        history: [],
        tools: [],
        context: [],
        status: 'paused',
      })
      currentAgentId.value = agentId
    }

    const agent = agents.value.find((a) => a.id === agentId)
    if (!agent) return

    const newMessage: Item = {
      content: message,
      role: 'user',
      type: 'message',
    }
    const updatedHistory = [...(agent.history ?? []), newMessage]

    await provider.updateAgent(agentId, {
      model: selectedModel.value,
      tools: selectedTools.value,
      context: selectedContext.value,
      history: updatedHistory,
      status: 'running',
    })
  }

  const sendNewMessage = async (message: string) => {
    const agentId = await createAgent({
      model: selectedModel.value,
      history: [],
      tools: [],
      context: [],
      status: 'paused',
    })
    await sendMessage(message, agentId)
  }

  const editMessage = async (newMessage: string, id?: string) => {
    const agentId = id ?? currentAgent.value?.id
    if (!agentId) return

    const agent = agents.value.find((a) => a.id === agentId)
    if (!agent) return

    const history = [...(agent.history ?? [])]
    let lastUserIndex = -1
    for (let i = history.length - 1; i >= 0; i--) {
      const message = history[i]
      if (message.type === 'message' && message.role === 'user') {
        lastUserIndex = i
        break
      }
    }
    if (lastUserIndex === -1) return

    const updatedHistory = history.slice(0, lastUserIndex)
    updatedHistory.push({
      content: newMessage,
      role: 'user',
      type: 'message',
    })

    await provider.updateAgent(agentId, {
      model: selectedModel.value,
      tools: selectedTools.value,
      context: selectedContext.value,
      history: updatedHistory,
      status: 'running',
    })
  }

  const status = computed(() => currentAgent.value?.status)

  return {
    agents,
    currentAgent,
    status,
    loading,
    currentAgentId,
    createAgent,
    forcePause,
    sendMessage,
    sendNewMessage,
    editMessage,
    selectedModel,
    setModel,
  }
}
