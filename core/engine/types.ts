import type { ToolRegistry } from '../tools/registry'
import type { CloudAgent, HistoryItem } from '../types/agent'
import type { ContextItem } from '../types/context'
import type { ToolItem } from '../types/tool'

export type { CloudAgent, HistoryItem, ContextItem, ToolItem }

/**
 * Agent status types
 */
export type AgentStatus = 'running' | 'awaiting_tool' | 'paused' | 'awaiting_human' | 'error'

/**
 * Result of agent processing
 */
export interface AgentProcessResult {
  history: HistoryItem[]
  status: AgentStatus
  error?: string
  contextTokens?: number
}

/**
 * LLM call parameters
 */
export interface LLMCallParams {
  projectId: string
  model: string
  history: HistoryItem[]
  tools: unknown[]
  agentId?: string
}

/**
 * LLM response
 */
export interface LLMResponse {
  output: {
    type: string
    name?: string
    arguments?: string
    call_id?: string
    content?: string
    role?: string
    [key: string]: unknown
  }
  history: HistoryItem[]
  usage?: {
    input_tokens: number
    output_tokens: number
  }
}

/**
 * LLM Provider interface for making calls to language models
 */
export interface LLMProvider {
  call(params: LLMCallParams): Promise<LLMResponse>
  getModels(): string[]
}

/**
 * Database Provider interface for agent and rulebook storage
 */
export interface DatabaseProvider {
  getAgent(id: string): Promise<CloudAgent>
  updateAgent(id: string, data: Partial<CloudAgent>): Promise<void>
  getRulebook(projectId: string): Promise<Array<{ content: string }>>
}

/**
 * Analytics Provider interface for tracking events
 */
export interface AnalyticsProvider {
  track(event: string, properties: Record<string, unknown>): void
}

/**
 * Logger interface for consistent logging
 */
export interface Logger {
  info(message: string, context?: Record<string, unknown>): void
  warn(message: string, context?: Record<string, unknown>): void
  error(message: string, context?: Record<string, unknown>): void
  debug(message: string, context?: Record<string, unknown>): void
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  data?: unknown
  error?: string
  unsupported?: boolean
}

/**
 * Agent controller options
 */
export interface ControllerOptions {
  /** Tool registry for executing tools */
  toolRegistry: ToolRegistry
  /** LLM provider for making LLM calls */
  llmProvider: LLMProvider
  /** Database provider for loading agent data */
  databaseProvider?: DatabaseProvider
  /** Analytics provider for tracking events */
  analyticsProvider?: AnalyticsProvider
  /** Logger for consistent logging */
  logger?: Logger
  /** Default model to use if agent doesn't specify */
  defaultModel?: string
  /** System prompt configuration (presence/absence pattern) */
  systemPromptConfig?: SystemPromptConfig
  /** Set of tools that require human approval (HOTL - Human On The Loop) */
  hotlTools?: Set<string>
  /** Message pause threshold - pause after N consecutive assistant messages */
  messagePauseThreshold?: number
}

/**
 * Recursive XML tag structure for building system prompts
 */
export interface XmlTag {
  tag: string
  value: string | number | boolean | XmlTag | XmlTag[]
}

/**
 * Configuration options for system prompt builder.
 * Uses presence/absence pattern: presence = include, absence = exclude.
 * When config is not provided at all, all sections use defaults from agent.
 * When config is provided, only specified fields are included.
 * 
 * Can accept either a flat config object or XmlTag[] structure for more complex nested XML.
 */
export type SystemPromptConfig =
  | {
      /** Agent role (e.g., "autonomous_content_management_agent") */
      role?: string
      /** Agent purpose statement */
      purpose?: string
      /** Core principles for the agent to follow */
      corePrinciples?: string[]
      /** Communication guidelines */
      communication?: string
      /** Execution guidelines */
      execution?: string
      /** Additional custom instructions */
      additionalInstructions?: string
      /** Project rulebook rules */
      rulebook?: Array<{ content: string }>
      /** User context items to include */
      userContext?: ContextItem[]
      /** Available tools to include */
      tools?: ToolItem[]
      /** Date/time - true for current, string for custom value, omit to exclude */
      dateTime?: string | boolean
      /** Timezone - true for current, string for custom value, omit to exclude */
      timezone?: string | boolean
    }
  | XmlTag[]

/**
 * System prompt builder function
 */
export type SystemPromptBuilder = (
  agent: CloudAgent,
  rulebook: Array<{ content: string }>,
  config?: SystemPromptConfig
) => string
