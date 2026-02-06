import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAgentLoopHandler, defaultGenerateName, defaultGetRules, createAgentLoop } from './agentLoop'
import type { AgentLoopConfig, DocumentChangeEvent } from './agentLoop.types'
import type { CloudAgent, HistoryItem } from './types'
import { ToolRegistry } from '../tools/registry'
import * as agentController from './agentController'

describe('Agent Loop', () => {
  const mockToolRegistry = new ToolRegistry()
  const mockLLMProvider = {
    call: vi.fn(),
    getModels: vi.fn(() => ['gpt-4.1', 'gpt-5-mini'])
  }
  const mockDatabaseProvider = {
    getAgent: vi.fn(),
    updateAgent: vi.fn(),
    getRulebook: vi.fn(() => Promise.resolve([]))
  }
  const mockAnalyticsProvider = {
    track: vi.fn()
  }
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }

  const baseConfig: AgentLoopConfig = {
    document: 'agents/{agentId}',
    toolRegistry: mockToolRegistry,
    llmProvider: mockLLMProvider,
    databaseProvider: mockDatabaseProvider,
    analyticsProvider: mockAnalyticsProvider,
    logger: mockLogger
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(agentController, 'processAgentController').mockResolvedValue({
      history: [],
      status: 'paused'
    })
  })

  describe('createAgentLoopHandler', () => {
    it('should skip if after snapshot is null', async () => {
      const handler = createAgentLoopHandler(baseConfig)
      const event: DocumentChangeEvent = {
        data: { after: null, before: null },
        params: { agentId: 'test-agent' }
      }

      await handler(event)

      expect(mockDatabaseProvider.updateAgent).not.toHaveBeenCalled()
    })

    it('should skip if status has not changed', async () => {
      const handler = createAgentLoopHandler(baseConfig)
      const agent: CloudAgent = {
        id: 'test-agent',
        projectId: 'project-1',
        model: 'gpt-4.1',
        status: 'running',
        tools: [],
        context: [],
        history: []
      }

      const event: DocumentChangeEvent = {
        data: {
          after: {
            data: () => agent,
            ref: {
              get: vi.fn().mockResolvedValue({ data: () => agent }),
              update: vi.fn()
            }
          },
          before: {
            data: () => ({ ...agent, status: 'running' })
          }
        },
        params: { agentId: 'test-agent' }
      }

      await handler(event)

      expect(mockDatabaseProvider.updateAgent).not.toHaveBeenCalled()
    })

    it('should process agent when status changes', async () => {
      vi.spyOn(agentController, 'processAgentController').mockResolvedValue({
        history: [],
        status: 'paused'
      })

      const handler = createAgentLoopHandler(baseConfig)
      const agent: CloudAgent = {
        id: 'test-agent',
        projectId: 'project-1',
        model: 'gpt-4.1',
        status: 'running',
        tools: [],
        context: [],
        history: []
      }

      const updatedAgent = { ...agent, status: 'running', name: 'Agent' }
      const mockRef = {
        get: vi.fn().mockResolvedValue({ data: () => updatedAgent }),
        update: vi.fn().mockResolvedValue(undefined)
      }

      const event: DocumentChangeEvent = {
        data: {
          after: {
            data: () => agent,
            ref: mockRef
          },
          before: {
            data: () => ({ ...agent, status: 'awaiting_tool' })
          }
        },
        params: { agentId: 'test-agent' }
      }

      await handler(event)

      expect(mockRef.update).toHaveBeenCalled()
    })

    it('should not update if agent was paused externally', async () => {
      const handler = createAgentLoopHandler(baseConfig)
      const agent: CloudAgent = {
        id: 'test-agent',
        projectId: 'project-1',
        model: 'gpt-4.1',
        status: 'running',
        tools: [],
        context: [],
        history: []
      }

      const pausedAgent = { ...agent, status: 'paused' }
      const mockRef = {
        get: vi.fn().mockResolvedValue({ data: () => pausedAgent }),
        update: vi.fn()
      }

      const event: DocumentChangeEvent = {
        data: {
          after: {
            data: () => agent,
            ref: mockRef
          },
          before: {
            data: () => ({ ...agent, status: 'awaiting_tool' })
          }
        },
        params: { agentId: 'test-agent' }
      }

      vi.spyOn(agentController, 'processAgentController').mockResolvedValue({
        history: [],
        status: 'running'
      })

      await handler(event)

      expect(mockRef.update).not.toHaveBeenCalled()
    })

    it('should generate name when agent name is default and history exists', async () => {
      const customGenerateName = vi.fn().mockResolvedValue('Custom Name')
      const handler = createAgentLoopHandler({
        ...baseConfig,
        generateName: customGenerateName
      })

      const agent: CloudAgent = {
        id: 'test-agent',
        projectId: 'project-1',
        model: 'gpt-4.1',
        status: 'running',
        name: 'Agent',
        tools: [],
        context: [],
        history: [{ type: 'message', role: 'user', content: 'Hello' }]
      }

      const updatedAgent = { ...agent, status: 'running', name: 'Agent' }
      const mockRef = {
        get: vi.fn().mockResolvedValue({ data: () => updatedAgent }),
        update: vi.fn().mockResolvedValue(undefined)
      }

      const event: DocumentChangeEvent = {
        data: {
          after: {
            data: () => agent,
            ref: mockRef
          },
          before: {
            data: () => ({ ...agent, status: 'awaiting_tool' })
          }
        },
        params: { agentId: 'test-agent' }
      }

      vi.spyOn(agentController, 'processAgentController').mockResolvedValue({
        history: agent.history,
        status: 'paused'
      })

      await handler(event)

      expect(customGenerateName).toHaveBeenCalledWith(
        'project-1',
        agent.history,
        'test-agent'
      )
      expect(mockRef.update).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Custom Name' })
      )
    })

    it('should use default name generator when custom is not provided', async () => {
      mockLLMProvider.call.mockResolvedValue({
        output: {
          type: 'message',
          content: [{ text: '📝 Test Agent', type: 'text' }]
        },
        history: []
      })

      const handler = createAgentLoopHandler(baseConfig)
      const agent: CloudAgent = {
        id: 'test-agent',
        projectId: 'project-1',
        model: 'gpt-4.1',
        status: 'running',
        name: 'Agent',
        tools: [],
        context: [],
        history: [{ type: 'message', role: 'user', content: 'Hello' }]
      }

      const updatedAgent = { ...agent, status: 'running', name: 'Agent' }
      const mockRef = {
        get: vi.fn().mockResolvedValue({ data: () => updatedAgent }),
        update: vi.fn().mockResolvedValue(undefined)
      }

      const event: DocumentChangeEvent = {
        data: {
          after: {
            data: () => agent,
            ref: mockRef
          },
          before: {
            data: () => ({ ...agent, status: 'awaiting_tool' })
          }
        },
        params: { agentId: 'test-agent' }
      }

      vi.spyOn(agentController, 'processAgentController').mockResolvedValue({
        history: agent.history,
        status: 'paused'
      })

      await handler(event)

      expect(mockLLMProvider.call).toHaveBeenCalled()
    })

    it('should handle missing agent ID gracefully', async () => {
      const handler = createAgentLoopHandler(baseConfig)
      const event: DocumentChangeEvent = {
        data: {
          after: {
            data: () => ({
              projectId: 'project-1',
              model: 'gpt-4.1',
              status: 'running',
              tools: [],
              context: [],
              history: []
            }),
            ref: {
              get: vi.fn(),
              update: vi.fn()
            }
          },
          before: null
        },
        params: {}
      }

      await handler(event)

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Agent loop: Missing agent ID',
        expect.any(Object)
      )
    })
  })

  describe('defaultGenerateName', () => {
    it('should return default name when LLM provider is not available', async () => {
      const name = await defaultGenerateName('project-1', [], 'agent-1', undefined)
      expect(name).toBe('Agent')
    })

    it('should call LLM provider with correct parameters', async () => {
      mockLLMProvider.call.mockResolvedValue({
        output: {
          type: 'message',
          content: [{ text: '📝 Test Agent', type: 'text' }]
        },
        history: []
      })

      const history: HistoryItem[] = [
        { type: 'message', role: 'user', content: 'Hello' }
      ]

      await defaultGenerateName('project-1', history, 'agent-1', mockLLMProvider)

      expect(mockLLMProvider.call).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-1',
          model: 'gpt-5-mini',
          agentId: 'agent-1'
        })
      )
    })

    it('should extract and use user messages from history', async () => {
      mockLLMProvider.call.mockResolvedValue({
        output: {
          type: 'message',
          content: [{ text: '📝 Test Agent', type: 'text' }]
        },
        history: []
      })

      const history: HistoryItem[] = [
        { type: 'message', role: 'user', content: 'First message' },
        { type: 'message', role: 'assistant', content: 'Response' },
        { type: 'message', role: 'user', content: 'Second message' },
        { type: 'message', role: 'user', content: 'Third message' },
        { type: 'message', role: 'user', content: 'Fourth message' } // Should only take first 3
      ]

      await defaultGenerateName('project-1', history, 'agent-1', mockLLMProvider)

      const callArgs = mockLLMProvider.call.mock.calls[0][0]
      expect(callArgs.history[1].content).toContain('First message')
      expect(callArgs.history[1].content).toContain('Second message')
      expect(callArgs.history[1].content).toContain('Third message')
      expect(callArgs.history[1].content).not.toContain('Fourth message')
    })

    it('should handle LLM errors gracefully', async () => {
      mockLLMProvider.call.mockRejectedValue(new Error('LLM error'))

      const name = await defaultGenerateName('project-1', [], 'agent-1', mockLLMProvider)
      expect(name).toBe('AI Assistant')
    })
  })

  describe('defaultGetRules', () => {
    it('should return empty array', async () => {
      const rules = await defaultGetRules('project-1')
      expect(rules).toEqual([])
    })
  })

  describe('createAgentLoop', () => {
    it('should return configuration object for Firebase Functions', () => {
      const result = createAgentLoop({
        ...baseConfig,
        secrets: ['SECRET1', 'SECRET2'],
        timeout: 120
      })

      expect(result.document).toBe('agents/{agentId}')
      expect(result.secrets).toEqual(['SECRET1', 'SECRET2'])
      expect(result.timeoutSeconds).toBe(120)
      expect(typeof result.handler).toBe('function')
    })

    it('should use default timeout if not provided', () => {
      const result = createAgentLoop(baseConfig)
      expect(result.timeoutSeconds).toBe(60)
    })

    it('should use empty secrets array if not provided', () => {
      const result = createAgentLoop(baseConfig)
      expect(result.secrets).toEqual([])
    })
  })
})
