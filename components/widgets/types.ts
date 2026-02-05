import type { Component } from 'vue'

/**
 * Widget components for a tool's input and output display.
 * Allows custom UI for tool interactions.
 */
export interface ToolWidget {
  /** Name of the tool this widget is for */
  toolName: string
  /** Optional custom component for rendering tool input form */
  inputComponent?: Component
  /** Optional custom component for rendering tool output */
  outputComponent?: Component
}
