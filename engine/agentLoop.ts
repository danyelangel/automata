import { processAgentController } from './agentController'
import type {
  CloudAgent,
  HistoryItem,
  ControllerOptions
} from './types'
import type {
  AgentLoopConfig,
  DocumentChangeEvent,
  CloudFunctionHandler
} from './agentLoop.types'

/**
 * Default name generator using LLM
 */
export async function defaultGenerateName(
  projectId: string,
  history: HistoryItem[],
  agentId: string,
  llmProvider: ControllerOptions['llmProvider']
): Promise<string> {
  if (!llmProvider) {
    return 'Agent'
  }

  try {
    // Extract the first few user messages to understand the agent's purpose
    const userMessages = history
      .filter(
        (item): item is HistoryItem & { type: 'message'; role: 'user'; content: string } =>
          item.type === 'message' && item.role === 'user' && typeof item.content === 'string'
      )
      .slice(0, 3)
      .map((item) => item.content)
      .join('\n')

    const result = await llmProvider.call({
      projectId,
      model: 'gpt-5-mini',
      history: [
        {
          role: 'system',
          type: 'message',
          content:
            "You are a helpful assistant that generates short, descriptive names that describe an agent's main intent. Generate a name that reflects the agent's main intent. Start the name with a single relevant emoji followed by a space (e.g., '📝 Notes'). Keep the textual part to 2-4 words maximum. Return only the name, nothing else."
        },
        {
          role: 'user',
          type: 'message',
          content: `Agent history:\n\n${userMessages}`
        }
      ],
      tools: [],
      agentId
    })

    if (
      result.output.type === 'message' &&
      'content' in result.output &&
      Array.isArray(result.output.content)
    ) {
      const content = result.output.content
        .map((c: { text?: string; type?: string }) => ('text' in c ? c.text : '[refusal]'))
        .join('\n')
      return content.trim() || 'AI Assistant'
    }

    return 'AI Assistant'
  } catch (error) {
    console.error('Error generating agent name:', error)
    return 'AI Assistant'
  }
}

/**
 * Default rules loader - returns empty array
 */
export async function defaultGetRules(_projectId: string): Promise<Array<{ content: string }>> {
  return []
}

/**
 * Creates an agent loop handler function
 * This is framework-agnostic and can be wrapped by Firebase Functions or other frameworks
 */
export function createAgentLoopHandler(config: AgentLoopConfig): CloudFunctionHandler {
  const {
    toolRegistry,
    llmProvider,
    databaseProvider,
    analyticsProvider,
    logger,
    defaultModel,
    systemPromptConfig,
    hotlTools,
    messagePauseThreshold,
    generateName,
    getRules
  } = config

  // Build controller options
  const controllerOptions: ControllerOptions = {
    toolRegistry,
    llmProvider: llmProvider!,
    databaseProvider,
    analyticsProvider,
    logger,
    defaultModel,
    systemPromptConfig,
    hotlTools,
    messagePauseThreshold
  }

  // Use custom or default implementations
  const nameGenerator = generateName || ((projectId, history, agentId) =>
    defaultGenerateName(projectId, history, agentId, llmProvider))
  const rulesLoader = getRules || defaultGetRules

  return async (event: DocumentChangeEvent) => {
    const { after, before } = event.data || { after: null, before: null }
    if (!after) return

    const afterData = after.data()
    const beforeData = before?.data()

    // Skip if status hasn't changed
    if (beforeData?.status === afterData?.status) return

    const agent = { ...afterData } as CloudAgent
    agent.id = event.params.agentId || agent.id

    if (!agent.id) {
      logger?.warn('Agent loop: Missing agent ID', { params: event.params })
      return
    }

    // Process the agent
    const agentResponse = await processAgentController(agent, controllerOptions)
    
    if (!agentResponse) {
      return
    }

    // Get current agent state to check if it was paused/errored externally
    const currentSnapshot = await after.ref.get()
    const currentAgentData = currentSnapshot.data() as CloudAgent | undefined

    if (!currentAgentData) {
      logger?.warn('Agent loop: Agent document not found after processing', { agentId: agent.id })
      return
    }

    // Don't update if agent was paused or errored externally
    if (currentAgentData.status === 'paused' || currentAgentData.status === 'error') {
      return
    }

    // Check if agent needs a name generated
    let agentName = currentAgentData.name || 'Agent'
    if (agentName === 'Agent' && agentResponse.history.length >= 1) {
      try {
        agentName = await nameGenerator(agent.projectId, agentResponse.history, agent.id)
      } catch (error) {
        logger?.error('Agent loop: Failed to generate agent name', {
          agentId: agent.id,
          error: error instanceof Error ? error.message : String(error)
        })
        agentName = 'Agent'
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      history: agentResponse.history,
      status: agentResponse.status,
      error: agentResponse.error || '',
      updatedAt: Date.now(),
      createdAt: currentAgentData.createdAt || Date.now(),
      name: agentName
    }

    // Update contextTokens if provided
    if (agentResponse.contextTokens !== undefined) {
      updateData.contextTokens = agentResponse.contextTokens
    }

    // Update the agent document
    await after.ref.update(updateData)
  }
}

/**
 * Creates a Firebase Cloud Function for agent loop
 * This is a convenience wrapper for Firebase Functions v2
 */
export function createAgentLoop(config: AgentLoopConfig) {
  const handler = createAgentLoopHandler(config)

  // Return a function that can be used with Firebase Functions
  // Note: This requires firebase-functions to be installed
  // Users should import onDocumentWritten from 'firebase-functions/v2/firestore'
  return {
    document: config.document,
    secrets: config.secrets || [],
    timeoutSeconds: config.timeout || 60,
    handler
  }
}
