import type { CloudAgent, HistoryItem, ControllerOptions } from './types'
import type { ToolRegistry } from '../tools/registry'

/**
 * Configuration for creating an agent loop
 */
export interface AgentLoopConfig {
  /** Firestore document path pattern (e.g., 'agents/{agentId}') */
  document: string
  /** Optional secrets to inject into the function */
  secrets?: string[]
  /** Timeout in seconds (default: 60) */
  timeout?: number
  /** Tool registry for agent execution */
  toolRegistry: ToolRegistry
  /** LLM provider for agent reasoning */
  llmProvider: ControllerOptions['llmProvider']
  /** Database provider for agent state and rulebook */
  databaseProvider?: ControllerOptions['databaseProvider']
  /** Analytics provider for tracking events */
  analyticsProvider?: ControllerOptions['analyticsProvider']
  /** Logger for debug/info messages */
  logger?: ControllerOptions['logger']
  /** Default model to use if agent doesn't specify one */
  defaultModel?: string
  /** System prompt configuration */
  systemPromptConfig?: ControllerOptions['systemPromptConfig']
  /** Set of HOTL (Human On The Loop) tool names */
  hotlTools?: Set<string>
  /** Message pause threshold */
  messagePauseThreshold?: number
  /** Custom name generator function */
  generateName?: (projectId: string, history: HistoryItem[], agentId: string) => Promise<string>
  /** Custom rules loader function */
  getRules?: (projectId: string) => Promise<Array<{ content: string }>>
}

/**
 * Document change event structure (Firebase-specific)
 */
export interface DocumentChangeEvent<T = CloudAgent> {
  data: {
    before: DocumentSnapshot<T> | null
    after: DocumentSnapshot<T> | null
  } | null
  params: Record<string, string>
}

/**
 * Document snapshot structure (Firebase-specific)
 */
export interface DocumentSnapshot<T = CloudAgent> {
  data(): T | undefined
  ref: DocumentReference
}

/**
 * Document reference structure (Firebase-specific)
 */
export interface DocumentReference {
  get(): Promise<DocumentSnapshot>
  update(data: Record<string, unknown>): Promise<void>
}

/**
 * Cloud function handler type
 */
export type CloudFunctionHandler = (event: DocumentChangeEvent) => Promise<void>
