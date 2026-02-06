import { computed, type Ref, type ComputedRef } from 'vue'
import type { CloudAgent } from '../core/types/agent'

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

/** Sort agents by updatedAt descending (newest first). */
function sortAgentsByUpdated(agents: CloudAgent[]): CloudAgent[] {
  return [...agents].sort((a, b) => {
    const at = a.updatedAt ?? a.createdAt ?? 0
    const bt = b.updatedAt ?? b.createdAt ?? 0
    return bt - at // desc: newer first
  })
}

/**
 * Composable for managing agents.
 * Provides reactive data for agent operations.
 */
export function useAgents(adapter: AgentDataAdapter) {
  const agents = computed(() => sortAgentsByUpdated(adapter.getAll().value))

  const agentsWithMessages = computed(() => {
    return agents.value.filter(agent => (agent.history?.length || 0) > 0)
  })

  return {
    agents,
    agentsWithMessages,
    getById: adapter.getById,
  }
}
