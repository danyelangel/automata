import { describe, it, expect, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { WidgetRegistry } from './WidgetRegistry'
import type { ToolWidget } from './types'

describe('WidgetRegistry', () => {
  let registry: WidgetRegistry

  // Mock Vue components
  const InputComponent = defineComponent({
    name: 'InputComponent',
    render: () => h('div', 'Input')
  })

  const OutputComponent = defineComponent({
    name: 'OutputComponent',
    render: () => h('div', 'Output')
  })

  beforeEach(() => {
    registry = new WidgetRegistry()
  })

  describe('register', () => {
    it('should register a widget successfully', () => {
      const widget: ToolWidget = {
        toolName: 'test-tool',
        inputComponent: InputComponent,
        outputComponent: OutputComponent
      }

      registry.register(widget)
      expect(registry.has('test-tool')).toBe(true)
      expect(registry.size).toBe(1)
    })

    it('should allow overwriting existing widget', () => {
      const widget1: ToolWidget = {
        toolName: 'test-tool',
        inputComponent: InputComponent
      }

      const widget2: ToolWidget = {
        toolName: 'test-tool',
        outputComponent: OutputComponent
      }

      registry.register(widget1)
      registry.register(widget2)

      expect(registry.size).toBe(1)
      expect(registry.getInputWidget('test-tool')).toBeUndefined()
      expect(registry.getOutputWidget('test-tool')).toBe(OutputComponent)
    })
  })

  describe('unregister', () => {
    it('should unregister a widget', () => {
      const widget: ToolWidget = {
        toolName: 'test-tool',
        inputComponent: InputComponent
      }

      registry.register(widget)
      expect(registry.has('test-tool')).toBe(true)

      registry.unregister('test-tool')
      expect(registry.has('test-tool')).toBe(false)
      expect(registry.size).toBe(0)
    })

    it('should not throw when unregistering non-existent widget', () => {
      expect(() => registry.unregister('non-existent')).not.toThrow()
    })
  })

  describe('getInputWidget', () => {
    it('should get input component for a tool', () => {
      const widget: ToolWidget = {
        toolName: 'test-tool',
        inputComponent: InputComponent
      }

      registry.register(widget)
      expect(registry.getInputWidget('test-tool')).toBe(InputComponent)
    })

    it('should return undefined for non-existent tool', () => {
      expect(registry.getInputWidget('non-existent')).toBeUndefined()
    })

    it('should return undefined when widget has no input component', () => {
      const widget: ToolWidget = {
        toolName: 'test-tool',
        outputComponent: OutputComponent
      }

      registry.register(widget)
      expect(registry.getInputWidget('test-tool')).toBeUndefined()
    })
  })

  describe('getOutputWidget', () => {
    it('should get output component for a tool', () => {
      const widget: ToolWidget = {
        toolName: 'test-tool',
        outputComponent: OutputComponent
      }

      registry.register(widget)
      expect(registry.getOutputWidget('test-tool')).toBe(OutputComponent)
    })

    it('should return undefined for non-existent tool', () => {
      expect(registry.getOutputWidget('non-existent')).toBeUndefined()
    })

    it('should return undefined when widget has no output component', () => {
      const widget: ToolWidget = {
        toolName: 'test-tool',
        inputComponent: InputComponent
      }

      registry.register(widget)
      expect(registry.getOutputWidget('test-tool')).toBeUndefined()
    })
  })

  describe('getWidget', () => {
    it('should get complete widget definition', () => {
      const widget: ToolWidget = {
        toolName: 'test-tool',
        inputComponent: InputComponent,
        outputComponent: OutputComponent
      }

      registry.register(widget)
      const retrieved = registry.getWidget('test-tool')

      expect(retrieved).toBe(widget)
      expect(retrieved?.toolName).toBe('test-tool')
      expect(retrieved?.inputComponent).toBe(InputComponent)
      expect(retrieved?.outputComponent).toBe(OutputComponent)
    })

    it('should return undefined for non-existent tool', () => {
      expect(registry.getWidget('non-existent')).toBeUndefined()
    })
  })

  describe('clear', () => {
    it('should clear all registered widgets', () => {
      const widget: ToolWidget = {
        toolName: 'test-tool',
        inputComponent: InputComponent
      }

      registry.register(widget)
      expect(registry.size).toBe(1)

      registry.clear()
      expect(registry.size).toBe(0)
      expect(registry.has('test-tool')).toBe(false)
    })
  })
})
