import { describe, it, expect, beforeEach } from 'vitest'
import { ToolRegistry } from './registry'
import type { ToolDefinition, ExecutionContext, ToolResult } from './types'

describe('ToolRegistry', () => {
  let registry: ToolRegistry

  beforeEach(() => {
    registry = new ToolRegistry()
  })

  describe('register', () => {
    it('should register a tool successfully', () => {
      const tool: ToolDefinition = {
        type: 'function',
        name: 'test-tool',
        description: 'A test tool',
        parameters: {},
        executor: async () => ({ success: true, output: 'test' })
      }

      registry.register(tool)
      expect(registry.has('test-tool')).toBe(true)
      expect(registry.size).toBe(1)
    })

    it('should throw error when registering duplicate tool', () => {
      const tool: ToolDefinition = {
        type: 'function',
        name: 'test-tool',
        description: 'A test tool',
        parameters: {},
        executor: async () => ({ success: true, output: 'test' })
      }

      registry.register(tool)
      expect(() => registry.register(tool)).toThrow('Tool "test-tool" is already registered')
    })
  })

  describe('unregister', () => {
    it('should unregister a tool', () => {
      const tool: ToolDefinition = {
        type: 'function',
        name: 'test-tool',
        description: 'A test tool',
        parameters: {},
        executor: async () => ({ success: true, output: 'test' })
      }

      registry.register(tool)
      expect(registry.has('test-tool')).toBe(true)

      registry.unregister('test-tool')
      expect(registry.has('test-tool')).toBe(false)
      expect(registry.size).toBe(0)
    })

    it('should not throw when unregistering non-existent tool', () => {
      expect(() => registry.unregister('non-existent')).not.toThrow()
    })
  })

  describe('execute', () => {
    it('should execute a tool successfully', async () => {
      const tool: ToolDefinition = {
        type: 'function',
        name: 'add',
        description: 'Adds two numbers',
        parameters: {},
        executor: async (args) => ({
          success: true,
          output: String((args.a as number) + (args.b as number))
        })
      }

      registry.register(tool)

      const context: ExecutionContext = {
        agent: { projectId: 'test', model: 'test-model' }
      }

      const result = await registry.execute('add', { a: 2, b: 3 }, context)
      expect(result.success).toBe(true)
      expect(result.output).toBe('5')
    })

    it('should throw error when executing non-existent tool', async () => {
      const context: ExecutionContext = {}
      await expect(registry.execute('non-existent', {}, context)).rejects.toThrow(
        'Tool "non-existent" not found'
      )
    })

    it('should handle executor errors gracefully', async () => {
      const tool: ToolDefinition = {
        type: 'function',
        name: 'failing-tool',
        description: 'A tool that fails',
        parameters: {},
        executor: async () => {
          throw new Error('Execution failed')
        }
      }

      registry.register(tool)

      const context: ExecutionContext = {}
      const result = await registry.execute('failing-tool', {}, context)

      expect(result.success).toBe(false)
      expect(result.output).toBe('')
      expect(result.error).toBe('Execution failed')
    })
  })

  describe('getTool', () => {
    it('should get a registered tool', () => {
      const tool: ToolDefinition = {
        type: 'function',
        name: 'test-tool',
        description: 'A test tool',
        parameters: {},
        executor: async () => ({ success: true, output: 'test' })
      }

      registry.register(tool)
      const retrieved = registry.getTool('test-tool')

      expect(retrieved).toBe(tool)
      expect(retrieved?.name).toBe('test-tool')
    })

    it('should return undefined for non-existent tool', () => {
      expect(registry.getTool('non-existent')).toBeUndefined()
    })
  })

  describe('getAvailable', () => {
    it('should return all registered tools', () => {
      const tool1: ToolDefinition = {
        type: 'function',
        name: 'tool1',
        description: 'First tool',
        parameters: {},
        executor: async () => ({ success: true, output: 'test' })
      }

      const tool2: ToolDefinition = {
        type: 'function',
        name: 'tool2',
        description: 'Second tool',
        parameters: {},
        executor: async () => ({ success: true, output: 'test' })
      }

      registry.register(tool1)
      registry.register(tool2)

      const tools = registry.getAvailable()
      expect(tools).toHaveLength(2)
      expect(tools.map((t) => t.name)).toContain('tool1')
      expect(tools.map((t) => t.name)).toContain('tool2')
    })

    it('should return empty array when no tools registered', () => {
      expect(registry.getAvailable()).toEqual([])
    })
  })

  describe('clear', () => {
    it('should clear all registered tools', () => {
      const tool: ToolDefinition = {
        type: 'function',
        name: 'test-tool',
        description: 'A test tool',
        parameters: {},
        executor: async () => ({ success: true, output: 'test' })
      }

      registry.register(tool)
      expect(registry.size).toBe(1)

      registry.clear()
      expect(registry.size).toBe(0)
      expect(registry.getAvailable()).toEqual([])
    })
  })
})
