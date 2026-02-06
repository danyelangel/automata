/**
 * Represents a context item that can be attached to an agent.
 * Context items provide additional information or capabilities to the agent.
 */
export interface ContextItem {
  /** Unique identifier for the context item */
  id: string
  /** Type of context (e.g., 'document', 'database', 'api') */
  type: string
  /** Human-readable name */
  name: string
}
