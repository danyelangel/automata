/**
 * Execution context provided to tool executors.
 * Contains all the information needed to execute a tool.
 */
export interface ExecutionContext {
  /** The agent instance executing the tool */
  agent?: {
    id?: string
    projectId: string
    model: string
  }
  /** User performing the action (if applicable) */
  user?: {
    id: string
    email?: string
  }
  /** Service configuration for external APIs */
  services?: {
    perplexity?: {
      apiKey: string
      apiUrl?: string
    }
    browser?: {
      getClient: (sessionId?: string) => Promise<{
        stagehand: any // Stagehand instance
        sessionUrl?: string
      }>
    }
    openai?: {
      generateImage: (params: {
        prompt: string
        size?: string
        transparentBackground?: boolean
        format?: 'png' | 'webp' | 'jpeg'
      }) => Promise<{ imageData: string, format: string }>
      callStructuredLLM: (params: {
        model?: string
        systemPrompt: string
        userPrompt: string
        schema: any
        trigger?: string
      }) => Promise<{ data: any, usage?: { input_tokens: number, output_tokens: number } }>
    }
    firebase?: {
      storage: {
        upload: (data: Buffer, path: string, contentType: string) => Promise<string>
      }
      firestore: {
        add: (collection: string, data: any) => Promise<string>
        query: (collection: string, filters: any) => Promise<any[]>
      }
    }
  }
  /** Callback to track usage metrics */
  trackUsage?: (params: {
    model: string
    input_tokens: number
    output_tokens: number
    function_called: string
    trigger: string
  }) => Promise<void>
  /** Additional context data */
  [key: string]: unknown
}

/**
 * Result of a tool execution.
 */
export interface ToolResult {
  /** Whether the execution was successful */
  success: boolean
  /** Output data from the tool */
  output: string
  /** Error message if execution failed */
  error?: string
  /** Additional metadata about the execution */
  metadata?: Record<string, unknown>
}

/**
 * Function that executes a tool's logic.
 * @param args - The parsed arguments for the tool
 * @param context - Execution context with agent/user info
 * @returns Result of the tool execution
 */
export type ToolExecutor = (
  args: Record<string, unknown>,
  context: ExecutionContext
) => Promise<ToolResult>

/**
 * Optional UI metadata for tool selector and display.
 * When provided, registry-based tool config (e.g. getToolConfigs) uses these values.
 */
export interface ToolUIMetadata {
  /** Display category (e.g. 'web', 'browser', 'content') */
  category?: string
  /** Material icon name or icon identifier */
  icon?: string
  /** Human-readable label (defaults to tool name) */
  label?: string
  /** If true, tool is shown but not selectable (e.g. premium) */
  premium?: boolean
  /** Feature flag key; tool is hidden when this flag is disabled in app settings */
  flag?: string
}

/**
 * Full definition of a tool including its executor function.
 */
export interface ToolDefinition {
  /** Always 'function' for function-based tools */
  type: 'function'
  /** Unique tool name */
  name: string
  /** Description of what the tool does */
  description: string
  /** JSON schema for the tool's parameters */
  parameters: Record<string, unknown>
  /** Whether to enforce strict parameter validation */
  strict?: boolean
  /** The function that executes the tool */
  executor: ToolExecutor
  /** Optional UI metadata for tool selector (category, icon, label) */
  ui?: ToolUIMetadata
}
