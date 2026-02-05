import { describe, it, expect, beforeEach, vi } from 'vitest'
import { processAgentController } from './agentController'
import type { CloudAgent, ControllerOptions, LLMProvider, ToolRegistry } from './types'

describe('Agent Controller', () => {
  let mockToolRegistry: ToolRegistry
  let mockLLMProvider: LLMProvider
  let mockLogger: any
  let mockAnalytics: any

  beforeEach(() => {
    mockToolRegistry = {
      register: vi.fn(),
      unregister: vi.fn(),
      execute: vi.fn().mockResolvedValue({ success: true, output: JSON.stringify({ result: 'test' }) }),
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
          { type: 'message', content: 'Test response', role: 'assistant' }
        ],
        usage: { input_tokens: 100, output_tokens: 50 }
      }),
      getModels: vi.fn().mockReturnValue(['gpt-4.1', 'gpt-5'])
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

  describe('processAgentController', () => {
    it('should process agent in running status', async () => {
      const agent: CloudAgent = {
        id: 'agent-1',
        projectId: 'project-1',
        model: 'gpt-4.1',
        tools: [],
        context: [],
        history: [{ type: 'message', role: 'user', content: 'Hello' }],
        status: 'running'
      }

      const options: ControllerOptions = {
        toolRegistry: mockToolRegistry,
        llmProvider: mockLLMProvider,
        logger: mockLogger
      }

      const result = await processAgentController(agent, options)

      expect(result).not.toBe(false)
      if (result !== false) {
        expect(result.status).toBe('paused')
        expect(result.history).toHaveLength(1)
        expect(mockLLMProvider.call).toHaveBeenCalledOnce()
      }
    })

    it('should not process paused agent', async () => {
      const agent: CloudAgent = {
        id: 'agent-1',
        projectId: 'project-1',
        model: 'gpt-4.1',
        tools: [],
        context: [],
        history: [],
        status: 'paused'
      }

      const options: ControllerOptions = {
        toolRegistry: mockToolRegistry,
        llmProvider: mockLLMProvider
      }

      const result = await processAgentController(agent, options)

      expect(result).toBe(false)
      expect(mockLLMProvider.call).not.toHaveBeenCalled()
    })

    it('should not process awaiting_human agent', async () => {
      const agent: CloudAgent = {
        id: 'agent-1',
        projectId: 'project-1',
        model: 'gpt-4.1',
        tools: [],
        context: [],
        history: [],
        status: 'awaiting_human'
      }

      const options: ControllerOptions = {
        toolRegistry: mockToolRegistry,
        llmProvider: mockLLMProvider
      }

      const result = await processAgentController(agent, options)

      expect(result).toBe(false)
    })

    it('should pause after consecutive assistant messages', async () => {
      const agent: CloudAgent = {
        id: 'agent-1',
        projectId: 'project-1',
        model: 'gpt-4.1',
        tools: [],
        context: [],
        history: [
          { type: 'message', role: 'user', content: 'Hello' },
          { type: 'message', role: 'assistant', content: 'Response 1' },
          { type: 'message', role: 'assistant', content: 'Response 2' },
          { type: 'message', role: 'assistant', content: 'Response 3' },
          { type: 'message', role: 'assistant', content: 'Response 4' }
        ],
        status: 'running'
      }

      const options: ControllerOptions = {
        toolRegistry: mockToolRegistry,
        llmProvider: mockLLMProvider,
        messagePauseThreshold: 4
      }

      const result = await processAgentController(agent, options)

      expect(result).not.toBe(false)
      if (result !== false) {
        expect(result.status).toBe('paused')
      }
    })

    it('should process awaiting_tool status', async () => {
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
        ],
        status: 'awaiting_tool'
      }

      const options: ControllerOptions = {
        toolRegistry: mockToolRegistry,
        llmProvider: mockLLMProvider,
        logger: mockLogger
      }

      const result = await processAgentController(agent, options)

      expect(result).not.toBe(false)
      if (result !== false) {
        expect(result.status).toBe('running')
        expect(result.history).toHaveLength(3)
        expect(result.history[2].type).toBe('function_call_output')
        expect(mockToolRegistry.execute).toHaveBeenCalledOnce()
      }
    })

    it('should handle null agent', async () => {
      const options: ControllerOptions = {
        toolRegistry: mockToolRegistry,
        llmProvider: mockLLMProvider,
        logger: mockLogger
      }

      const result = await processAgentController(null as any, options)

      expect(result).toBe(false)
      expect(mockLogger.warn).toHaveBeenCalled()
    })

    it('should handle unknown status', async () => {
      const agent: CloudAgent = {
        id: 'agent-1',
        projectId: 'project-1',
        model: 'gpt-4.1',
        tools: [],
        context: [],
        history: [],
        status: 'unknown' as any
      }

      const options: ControllerOptions = {
        toolRegistry: mockToolRegistry,
        llmProvider: mockLLMProvider,
        logger: mockLogger
      }

      const result = await processAgentController(agent, options)

      expect(result).toBe(false)
      expect(mockLogger.warn).toHaveBeenCalled()
    })

    it('should use custom message pause threshold', async () => {
      const agent: CloudAgent = {
        id: 'agent-1',
        projectId: 'project-1',
        model: 'gpt-4.1',
        tools: [],
        context: [],
        history: [
          { type: 'message', role: 'assistant', content: 'Response 1' },
          { type: 'message', role: 'assistant', content: 'Response 2' }
        ],
        status: 'running'
      }

      const options: ControllerOptions = {
        toolRegistry: mockToolRegistry,
        llmProvider: mockLLMProvider,
        messagePauseThreshold: 2
      }

      const result = await processAgentController(agent, options)

      expect(result).not.toBe(false)
      if (result !== false) {
        expect(result.status).toBe('paused')
      }
    })
  })
})
