import { computed, type Ref, type ComputedRef } from 'vue'
import type { CloudAgent } from '../types/agent'

/**
 * Data access adapter interface for agents.
 * Implement this in your application to provide database-specific access.
 */
export interface AgentDataAdapter {
  /** Get all agents for a project */
  getAll: () => Ref<CloudAgent[]> | ComputedRef<CloudAgent[]>
  /** Get a single agent by ID */
  getById: (id: string) => Ref<CloudAgent | undefined> | ComputedRef<CloudAgent | undefined>
}

/**
 * Composable for managing agents.
 * Provides reactive data for agent operations.
 */
export function useAgents(adapter: AgentDataAdapter) {
  const agents = adapter.getAll()

  const agentsWithMessages = computed(() => {
    return agents.value.filter(agent => (agent.history?.length || 0) > 0)
  })

  return {
    agents,
    agentsWithMessages,
    getById: adapter.getById,
  }
}
