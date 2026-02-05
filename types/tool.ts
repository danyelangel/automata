/**
 * Lightweight reference to a tool instance.
 * Used in agent configuration to specify which tools are available.
 */
export interface ToolItem {
  /** Tool type identifier */
  type: string
  /** Tool name */
  name: string
  /** Human-readable description of what the tool does */
  description?: string
  /** Tool-specific configuration parameters */
  parameters?: Record<string, unknown>
}

/**
 * Full tool definition with JSON schema for parameters.
 * Used by LLM providers to understand tool capabilities.
 */
export interface Tool {
  /** Always 'function' for function-based tools */
  type: 'function'
  /** Unique tool name */
  name: string
  /** Description of tool functionality for the LLM */
  description: string
  /** JSON schema defining the tool's parameters */
  parameters: Record<string, unknown>
  /** Whether to enforce strict parameter validation */
  strict: boolean | null
  /** Disallow additional properties in parameters */
  additionalProperties: false
}

/**
 * Represents a function call from the agent.
 */
export interface FunctionCall {
  /** Type identifier for function calls */
  type: 'function_call'
  /** Name of the function to call */
  name: string
  /** Serialized JSON arguments */
  arguments: string
  /** Unique identifier for this call */
  call_id: string
}

/**
 * Represents the output/result of a function execution.
 */
export interface FunctionCallOutput {
  /** Type identifier for function outputs */
  type: 'function_call_output'
  /** Matches the call_id from the FunctionCall */
  call_id: string
  /** Serialized result of the function execution */
  output: string
  /** Execution status (success, error, etc.) */
  status?: string
}
