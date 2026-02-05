import type { Automation, SkipResult } from '../types/automation'
import type { ContextItem } from '../types/context'
import type { ToolRegistry } from '../tools/registry'

/**
 * Configuration for creating an automation executor.
 */
export interface AutomationExecutorConfig {
  /** Cron schedule expression (e.g., '* * * * *' for every minute) */
  schedule: string
  /** Timezone for the schedule (e.g., 'UTC') */
  timeZone: string
  /** Tool registry to use for agent tools */
  toolRegistry: ToolRegistry
  /** Database instance (e.g., Firestore) */
  db: any
  /** Collection name for automations */
  automationsCollection: string
  /** Collection name for agents */
  agentsCollection: string
  /** Function to build context items from automation data */
  buildContext: (automation: Automation) => ContextItem[]
  /** Optional prefix for agent names (default: '⚡️ ') */
  agentNamePrefix?: string
  /** Default model to use if automation doesn't specify one */
  defaultModel?: string
  /** Optional callback for tracking events */
  track?: (event: string, data?: Record<string, unknown>) => void | Promise<void>
}

// Re-export types from main types
export type { Automation, SkipResult } from '../types/automation'
export type { ContextItem } from '../types/context'
