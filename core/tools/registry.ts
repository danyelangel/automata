import type { ToolDefinition, ExecutionContext, ToolResult } from './types'

/**
 * Registry for managing available tools.
 * Provides registration, lookup, and execution capabilities.
 */
export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map()

  /**
   * Register a new tool.
   * @param tool - The tool definition to register
   * @throws Error if a tool with the same name is already registered
   */
  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`)
    }
    this.tools.set(tool.name, tool)
  }

  /**
   * Unregister a tool by name.
   * @param name - The name of the tool to unregister
   */
  unregister(name: string): void {
    this.tools.delete(name)
  }

  /**
   * Execute a tool with the given arguments and context.
   * @param name - The name of the tool to execute
   * @param args - The arguments to pass to the tool
   * @param context - The execution context
   * @returns The result of the tool execution
   * @throws Error if the tool is not found
   */
  async execute(
    name: string,
    args: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ToolResult> {
    const tool = this.tools.get(name)
    if (!tool) {
      throw new Error(`Tool "${name}" not found`)
    }

    try {
      return await tool.executor(args, context)
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Get all registered tools.
   * @returns Array of all tool definitions
   */
  getAvailable(): ToolDefinition[] {
    return Array.from(this.tools.values())
  }

  /**
   * Get a specific tool by name.
   * @param name - The name of the tool
   * @returns The tool definition or undefined if not found
   */
  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name)
  }

  /**
   * Check if a tool is registered.
   * @param name - The name of the tool
   * @returns True if the tool is registered
   */
  has(name: string): boolean {
    return this.tools.has(name)
  }

  /**
   * Clear all registered tools.
   */
  clear(): void {
    this.tools.clear()
  }

  /**
   * Get the number of registered tools.
   */
  get size(): number {
    return this.tools.size
  }
}
