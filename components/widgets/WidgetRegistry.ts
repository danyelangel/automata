import type { Component } from 'vue'
import type { ToolWidget } from './types'

/**
 * Registry for managing tool UI widgets.
 * Maps tool names to their custom input/output components.
 */
export class WidgetRegistry {
  private widgets: Map<string, ToolWidget> = new Map()

  /**
   * Register a widget for a tool.
   * If both inputComponent and outputComponent are provided, automatically registers
   * both the input widget (toolName) and output widget (toolName + "Output").
   * @param widget - The widget definition to register
   */
  register(widget: ToolWidget): void {
    // Register the input widget if provided
    if (widget.inputComponent) {
      this.widgets.set(widget.toolName, {
        toolName: widget.toolName,
        inputComponent: widget.inputComponent,
      })
    }
    
    // Register the output widget if provided
    if (widget.outputComponent) {
      // If toolName already ends with "Output", use it as-is
      // Otherwise append "Output" to the toolName
      const outputToolName = widget.toolName.endsWith('Output') 
        ? widget.toolName 
        : `${widget.toolName}Output`
      
      this.widgets.set(outputToolName, {
        toolName: outputToolName,
        outputComponent: widget.outputComponent,
      })
    }
  }

  /**
   * Unregister a widget by tool name.
   * @param toolName - The name of the tool
   */
  unregister(toolName: string): void {
    this.widgets.delete(toolName)
  }

  /**
   * Get the input component for a tool.
   * @param toolName - The name of the tool
   * @returns The input component or undefined if not registered
   */
  getInputWidget(toolName: string): Component | undefined {
    return this.widgets.get(toolName)?.inputComponent
  }

  /**
   * Get the output component for a tool.
   * @param toolName - The name of the tool
   * @returns The output component or undefined if not registered
   */
  getOutputWidget(toolName: string): Component | undefined {
    return this.widgets.get(toolName)?.outputComponent
  }

  /**
   * Get the complete widget definition for a tool.
   * @param toolName - The name of the tool
   * @returns The widget definition or undefined if not registered
   */
  getWidget(toolName: string): ToolWidget | undefined {
    return this.widgets.get(toolName)
  }

  /**
   * Check if a tool has a registered widget.
   * @param toolName - The name of the tool
   * @returns True if the tool has a widget
   */
  has(toolName: string): boolean {
    return this.widgets.has(toolName)
  }

  /**
   * Clear all registered widgets.
   */
  clear(): void {
    this.widgets.clear()
  }

  /**
   * Get the number of registered widgets.
   */
  get size(): number {
    return this.widgets.size
  }
}
