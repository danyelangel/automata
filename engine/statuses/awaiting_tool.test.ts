import { describe, it, expect, beforeEach, vi } from 'vitest'
import { awaiting_tool } from './awaiting_tool'
import type { CloudAgent, ControllerOptions, ToolRegistry } from '../types'

describe('Awaiting Tool Status Handler', () => {
  let mockToolRegistry: ToolRegistry
  let mockLogger: any
  let mockAnalytics: any

  beforeEach(() => {
    mockToolRegistry = {
      register: vi.fn(),
      unregister: vi.fn(),
      execute: vi.fn().mockResolvedValue({
        success: true,
        output: JSON.stringify({ result: 'test data' })
      }),
      get: vi.fn(),
      has: vi.fn(),
      listTools: vi.fn()
    }

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    }

    mockAnalytics = {
      track: vi.fn()
    }
  })

  describe('awaiting_tool', () => {
    it('should execute tool and return running status', async () => {
      const agent: CloudAgent = {
        id: 'agent-1',
        projectId: 'project-1',
        model: 'gpt-4.1',
        tools: [],
        context: [],
        history: [
          { type: 'message', role: 'user', content: 'Hello' },
          {
            type: 'function_call',
            name: 'TestTool',
            arguments: '{"arg": "value"}',
            call_id: 'call-123'
          }
        ]
      }

      const options: ControllerOptions = {
        toolRegistry: mockToolRegistry,
        llmProvider: {} as any,
        logger: mockLogger,
        analyticsProvider: mockAnalytics
      }

      const result = await awaiting_tool(agent, agent.history, options)

      expect(result.status).toBe('running')
      expect(result.history).toHaveLength(3)
      expect(result.history[2]).toMatchObject({
        type: 'function_call_output',
        call_id: 'call-123',
        status: 'completed'
      })
      expect(mockToolRegistry.execute).toHaveBeenCalledWith(
        'TestTool',
        { arg: 'value' },
        expect.objectContaining({
          agent: expect.objectContaining({
            projectId: 'project-1'
          })
        })
      )
      expect(mockAnalytics.track).toHaveBeenCalledWith('agent_tool_executed', expect.any(Object))
    })

    it('should handle tool execution error', async () => {
      mockToolRegistry.execute = vi.fn().mockResolvedValue({
        success: false,
        error: 'Tool execution failed'
      })

      const agent: CloudAgent = {
        id: 'agent-1',
        projectId: 'project-1',
        model: 'gpt-4.1',
        tools: [],
        context: [],
        history: [
          {
            type: 'function_call',
            name: 'TestTool',
            arguments: '{}',
            call_id: 'call-123'
          }
        ]
      }

      const options: ControllerOptions = {
        toolRegistry: mockToolRegistry,
        llmProvider: {} as any,
        logger: mockLogger
      }

      const result = await awaiting_tool(agent, agent.history, options)

      expect(result.status).toBe('running')
      expect(result.history[1].output).toContain('Tool execution failed')
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('tool execution failed'),
        expect.any(Object)
      )
    })

    it('should handle tool execution exception', async () => {
      mockToolRegistry.execute = vi.fn().mockRejectedValue(new Error('Exception occurred'))

      const agent: CloudAgent = {
        id: 'agent-1',
        projectId: 'project-1',
        model: 'gpt-4.1',
        tools: [],
        context: [],
        history: [
          {
            type: 'function_call',
            name: 'TestTool',
            arguments: '{}',
            call_id: 'call-123'
          }
        ]
      }

      const options: ControllerOptions = {
        toolRegistry: mockToolRegistry,
        llmProvider: {} as any,
        logger: mockLogger,
        analyticsProvider: mockAnalytics
      }

      const result = await awaiting_tool(agent, agent.history, options)

      expect(result.status).toBe('error')
      expect(result.history[1]).toMatchObject({
        type: 'function_call_output',
        call_id: 'call-123',
        status: 'failed'
      })
      expect(result.history[1].output).toContain('Exception occurred')
      expect(mockLogger.error).toHaveBeenCalled()
      expect(mockAnalytics.track).toHaveBeenCalledWith('agent_tool_error', expect.any(Object))
    })

    it('should handle JSON output parsing', async () => {
      mockToolRegistry.execute = vi.fn().mockResolvedValue({
        success: true,
        output: '{"nested": {"data": "value"}}'
      })

      const agent: CloudAgent = {
        id: 'agent-1',
        projectId: 'project-1',
        model: 'gpt-4.1',
        tools: [],
        context: [],
        history: [
          {
            type: 'function_call',
            name: 'TestTool',
            arguments: '{}',
            call_id: 'call-123'
          }
        ]
      }

      const options: ControllerOptions = {
        toolRegistry: mockToolRegistry,
        llmProvider: {} as any
      }

      const result = await awaiting_tool(agent, agent.history, options)

      const output = JSON.parse(result.history[1].output || '{}')
      expect(output).toMatchObject({
        nested: { data: 'value' }
      })
    })

    it('should handle non-JSON output', async () => {
      mockToolRegistry.execute = vi.fn().mockResolvedValue({
        success: true,
        output: 'plain text result'
      })

      const agent: CloudAgent = {
        id: 'agent-1',
        projectId: 'project-1',
        model: 'gpt-4.1',
        tools: [],
        context: [],
        history: [
          {
            type: 'function_call',
            name: 'TestTool',
            arguments: '{}',
            call_id: 'call-123'
          }
        ]
      }

      const options: ControllerOptions = {
        toolRegistry: mockToolRegistry,
        llmProvider: {} as any
      }

      const result = await awaiting_tool(agent, agent.history, options)

      expect(result.status).toBe('running')
      expect(result.history[1].output).toContain('plain text result')
    })

    it('should work without analytics provider', async () => {
      const agent: CloudAgent = {
        id: 'agent-1',
        projectId: 'project-1',
        model: 'gpt-4.1',
        tools: [],
        context: [],
        history: [
          {
            type: 'function_call',
            name: 'TestTool',
            arguments: '{}',
            call_id: 'call-123'
          }
        ]
      }

      const options: ControllerOptions = {
        toolRegistry: mockToolRegistry,
        llmProvider: {} as any
      }

      const result = await awaiting_tool(agent, agent.history, options)

      expect(result.status).toBe('running')
    })

    it('should pass agent context to tool execution', async () => {
      const agent: CloudAgent = {
        id: 'agent-1',
        projectId: 'project-1',
        model: 'gpt-5',
        tools: [],
        context: [],
        history: [
          {
            type: 'function_call',
            name: 'TestTool',
            arguments: '{}',
            call_id: 'call-123'
          }
        ]
      }

      const options: ControllerOptions = {
        toolRegistry: mockToolRegistry,
        llmProvider: {} as any
      }

      await awaiting_tool(agent, agent.history, options)

      expect(mockToolRegistry.execute).toHaveBeenCalledWith(
        'TestTool',
        {},
        expect.objectContaining({
          agent: {
            id: 'agent-1',
            projectId: 'project-1',
            model: 'gpt-5'
          }
        })
      )
    })
  })
})
