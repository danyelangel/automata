import { describe, it, expect, beforeEach, vi } from 'vitest'
import { running } from './running'
import type { CloudAgent, ControllerOptions, LLMProvider, ToolRegistry } from '../types'

describe('Running Status Handler', () => {
  let mockToolRegistry: ToolRegistry
  let mockLLMProvider: LLMProvider
  let mockDatabaseProvider: any
  let mockLogger: any
  let mockAnalytics: any

  beforeEach(() => {
    mockToolRegistry = {
      register: vi.fn(),
      unregister: vi.fn(),
      execute: vi.fn(),
      get: vi.fn(),
      has: vi.fn(),
      listTools: vi.fn().mockReturnValue([
        { type: 'function', name: 'TestTool', description: 'A test tool' }
      ])
    }

    mockLLMProvider = {
      call: vi.fn().mockResolvedValue({
        output: { type: 'message', content: 'Test response', role: 'assistant' },
        history: [
          { type: 'message', role: 'system', content: 'System prompt' },
          { type: 'message', role: 'user', content: 'Hello' },
          { type: 'message', role: 'assistant', content: 'Test response' }
        ],
        usage: { input_tokens: 100, output_tokens: 50 }
      }),
      getModels: vi.fn().mockReturnValue(['gpt-4.1'])
    }

    mockDatabaseProvider = {
      getAgent: vi.fn(),
      updateAgent: vi.fn(),
      getRulebook: vi.fn().mockResolvedValue([
        { content: 'Rule 1' },
        { content: 'Rule 2' }
      ])
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

  describe('running', () => {
    it('should call LLM and return paused status for message output', async () => {
      const agent: CloudAgent = {
        id: 'agent-1',
        projectId: 'project-1',
        model: 'gpt-4.1',
        tools: [],
        context: [],
        history: [{ type: 'message', role: 'user', content: 'Hello' }]
      }

      const options: ControllerOptions = {
        toolRegistry: mockToolRegistry,
        llmProvider: mockLLMProvider,
        databaseProvider: mockDatabaseProvider,
        logger: mockLogger,
        analyticsProvider: mockAnalytics
      }

      const result = await running(agent, agent.history, options)

      expect(result.status).toBe('paused')
      expect(result.history).toHaveLength(2)
      expect(result.contextTokens).toBe(150)
      expect(mockLLMProvider.call).toHaveBeenCalledOnce()
      expect(mockDatabaseProvider.getRulebook).toHaveBeenCalledWith('project-1')
      expect(mockAnalytics.track).toHaveBeenCalledWith('agent_message_generated', expect.any(Object))
    })

    it('should return awaiting_tool status for function call output', async () => {
      mockLLMProvider.call = vi.fn().mockResolvedValue({
        output: {
          type: 'function_call',
          name: 'TestTool',
          arguments: '{"arg": "value"}',
          call_id: 'call-123'
        },
        history: [
          { type: 'message', role: 'user', content: 'Hello' },
          {
            type: 'function_call',
            name: 'TestTool',
            arguments: '{"arg": "value"}',
            call_id: 'call-123'
          }
        ],
        usage: { input_tokens: 100, output_tokens: 50 }
      })

      const agent: CloudAgent = {
        id: 'agent-1',
        projectId: 'project-1',
        model: 'gpt-4.1',
        tools: [],
        context: [],
        history: [{ type: 'message', role: 'user', content: 'Hello' }]
      }

      const options: ControllerOptions = {
        toolRegistry: mockToolRegistry,
        llmProvider: mockLLMProvider,
        logger: mockLogger
      }

      const result = await running(agent, agent.history, options)

      expect(result.status).toBe('awaiting_tool')
      expect(result.history).toHaveLength(2)
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('awaiting tool call'),
        expect.any(Object)
      )
    })

    it('should return awaiting_human status for HOTL tool', async () => {
      mockLLMProvider.call = vi.fn().mockResolvedValue({
        output: {
          type: 'function_call',
          name: 'HOTLTool',
          arguments: '{}',
          call_id: 'call-123'
        },
        history: [
          { type: 'message', role: 'user', content: 'Hello' },
          { type: 'function_call', name: 'HOTLTool', arguments: '{}', call_id: 'call-123' }
        ],
        usage: { input_tokens: 100, output_tokens: 50 }
      })

      const agent: CloudAgent = {
        id: 'agent-1',
        projectId: 'project-1',
        model: 'gpt-4.1',
        tools: [],
        context: [],
        history: [{ type: 'message', role: 'user', content: 'Hello' }]
      }

      const options: ControllerOptions = {
        toolRegistry: mockToolRegistry,
        llmProvider: mockLLMProvider,
        logger: mockLogger,
        hotlTools: new Set(['HOTLTool'])
      }

      const result = await running(agent, agent.history, options)

      expect(result.status).toBe('awaiting_human')
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('awaiting human input'),
        expect.any(Object)
      )
    })

    it('should handle LLM errors', async () => {
      mockLLMProvider.call = vi.fn().mockRejectedValue(new Error('LLM failed'))

      const agent: CloudAgent = {
        id: 'agent-1',
        projectId: 'project-1',
        model: 'gpt-4.1',
        tools: [],
        context: [],
        history: [{ type: 'message', role: 'user', content: 'Hello' }]
      }

      const options: ControllerOptions = {
        toolRegistry: mockToolRegistry,
        llmProvider: mockLLMProvider,
        logger: mockLogger,
        analyticsProvider: mockAnalytics
      }

      const result = await running(agent, agent.history, options)

      expect(result.status).toBe('error')
      expect(result.error).toBe('LLM failed')
      expect(mockLogger.error).toHaveBeenCalled()
      expect(mockAnalytics.track).toHaveBeenCalledWith('agent_message_error', expect.any(Object))
    })

    it('should use default model when agent model is not specified', async () => {
      const agent: CloudAgent = {
        id: 'agent-1',
        projectId: 'project-1',
        model: '',
        tools: [],
        context: [],
        history: [{ type: 'message', role: 'user', content: 'Hello' }]
      }

      const options: ControllerOptions = {
        toolRegistry: mockToolRegistry,
        llmProvider: mockLLMProvider,
        defaultModel: 'gpt-5'
      }

      await running(agent, agent.history, options)

      expect(mockLLMProvider.call).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-5'
        })
      )
    })

    it('should filter out system messages from history', async () => {
      const agent: CloudAgent = {
        id: 'agent-1',
        projectId: 'project-1',
        model: 'gpt-4.1',
        tools: [],
        context: [],
        history: [{ type: 'message', role: 'user', content: 'Hello' }]
      }

      const options: ControllerOptions = {
        toolRegistry: mockToolRegistry,
        llmProvider: mockLLMProvider
      }

      const result = await running(agent, agent.history, options)

      // System message should be filtered out from the returned history
      expect(result.history.every(item => item.role !== 'system')).toBe(true)
    })

    it('should work without database provider', async () => {
      const agent: CloudAgent = {
        id: 'agent-1',
        projectId: 'project-1',
        model: 'gpt-4.1',
        tools: [],
        context: [],
        history: [{ type: 'message', role: 'user', content: 'Hello' }]
      }

      const options: ControllerOptions = {
        toolRegistry: mockToolRegistry,
        llmProvider: mockLLMProvider
      }

      const result = await running(agent, agent.history, options)

      expect(result.status).toBe('paused')
      expect(mockLLMProvider.call).toHaveBeenCalled()
    })
  })
})
