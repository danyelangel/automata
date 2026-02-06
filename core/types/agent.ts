import type { ToolItem } from './tool'
import type { ContextItem } from './context'

/**
 * Represents a single item in the agent's conversation history.
 * Can be a message, function call, or function output.
 */
export interface HistoryItem {
  /** Type of history item (e.g., 'message', 'function_call', 'function_call_output') */
  type: string
  /** Role of the message sender (e.g., 'user', 'assistant', 'system') */
  role?: string
  /** Text content of the message */
  content?: string
  /** Function name for function calls */
  name?: string
  /** Serialized function arguments */
  arguments?: string
  /** Unique identifier for function calls */
  call_id?: string
  /** Function execution output */
  output?: string
  /** Execution status */
  status?: string
  /** Allow additional properties for extensibility */
  [key: string]: unknown
}

/**
 * Core configuration for a cloud-based agent instance.
 */
export interface CloudAgent {
  /** Unique identifier for the agent */
  id?: string
  /** Project this agent belongs to */
  projectId: string
  /** AI model identifier (e.g., 'gpt-4', 'claude-3') */
  model: string
  /** Available tools for the agent */
  tools: ToolItem[]
  /** Context items available to the agent */
  context: ContextItem[]
  /** Conversation history */
  history: HistoryItem[]
  /** Current agent status */
  status?: string
  /** Human-readable name for the agent */
  name?: string
  /** Creation timestamp */
  createdAt?: number
  /** Last update timestamp */
  updatedAt?: number
  /** Agent type classification */
  type?: string
  /** Associated automation ID if running as automation */
  automationId?: string
  /** Total tokens consumed by this agent */
  tokensUsed?: number
  /** Tokens used for context */
  contextTokens?: number
  /** User ID who created the agent */
  createdBy?: string
  /** Email of creator */
  createdByEmail?: string
  /** User ID who last updated the agent */
  updatedBy?: string
  /** Email of last updater */
  updatedByEmail?: string
}

/**
 * Simple message structure for agent communication.
 */
export interface Message {
  /** Role of the message sender */
  role: string
  /** Message content */
  content: string
}
