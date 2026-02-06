import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BrowserAct, executeBrowserAct } from './BrowserAct.tool'
import type { ExecutionContext, ToolResult } from '../types'

describe('BrowserAct Tool', () => {
  let mockStagehand: any
  let mockGetClient: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockStagehand = {
      page: {
        act: vi.fn().mockResolvedValue('Action completed successfully')
      }
    }

    mockGetClient = vi.fn().mockResolvedValue({
      stagehand: mockStagehand
    })
  })

  describe('Tool Definition', () => {
    it('should have correct structure', () => {
      expect(BrowserAct.type).toBe('function')
      expect(BrowserAct.name).toBe('BrowserAct')
      expect(BrowserAct.description).toContain('THIRD STEP')
      expect(BrowserAct.strict).toBe(false)
    })

    it('should have correct parameters schema', () => {
      expect(BrowserAct.parameters).toMatchObject({
        type: 'object',
        additionalProperties: false,
        properties: {
          sessionId: {
            type: 'string',
            description: expect.any(String)
          },
          action: {
            type: 'string',
            description: expect.any(String)
          }
        },
        required: ['sessionId', 'action']
      })
    })

    it('should have executor function', () => {
      expect(BrowserAct.executor).toBe(executeBrowserAct)
      expect(typeof BrowserAct.executor).toBe('function')
    })
  })

  describe('executeBrowserAct', () => {
    it('should successfully execute action', async () => {
      const sessionId = 'test-session-123'
      const action = 'click the login button'

      const context: ExecutionContext = {
        services: {
          browser: {
            getClient: mockGetClient
          }
        }
      }

      const result = await executeBrowserAct(
        { sessionId, action },
        context
      )

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      
      const output = JSON.parse(result.output)
      expect(output.sessionId).toBe(sessionId)
      expect(output.result).toBe('Action completed successfully')

      expect(mockGetClient).toHaveBeenCalledOnce()
      expect(mockGetClient).toHaveBeenCalledWith(sessionId)
      expect(mockStagehand.page.act).toHaveBeenCalledOnce()
      expect(mockStagehand.page.act).toHaveBeenCalledWith(action)

      expect(result.metadata).toMatchObject({
        sessionId
      })
    })

    it('should track usage', async () => {
      const trackUsage = vi.fn().mockResolvedValue(undefined)

      const context: ExecutionContext = {
        services: {
          browser: {
            getClient: mockGetClient
          }
        },
        trackUsage
      }

      const result = await executeBrowserAct(
        { sessionId: 'test-session', action: 'click button' },
        context
      )

      expect(result.success).toBe(true)
      expect(trackUsage).toHaveBeenCalledOnce()
      expect(trackUsage).toHaveBeenCalledWith({
        model: 'gpt-5',
        input_tokens: 0,
        output_tokens: 0,
        function_called: 'BrowserAct',
        trigger: 'browser_act'
      })
    })

    it('should handle missing sessionId', async () => {
      const context: ExecutionContext = {
        services: {
          browser: {
            getClient: mockGetClient
          }
        }
      }

      const result = await executeBrowserAct(
        { action: 'click button' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('sessionId is required')
      expect(mockGetClient).not.toHaveBeenCalled()
    })

    it('should handle missing action', async () => {
      const context: ExecutionContext = {
        services: {
          browser: {
            getClient: mockGetClient
          }
        }
      }

      const result = await executeBrowserAct(
        { sessionId: 'test-session' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('action is required')
      expect(mockGetClient).not.toHaveBeenCalled()
    })

    it('should handle missing browser service', async () => {
      const context: ExecutionContext = {}

      const result = await executeBrowserAct(
        { sessionId: 'test-session', action: 'click button' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Browser service not configured. Provide context.services.browser.getClient')
    })

    it('should handle action execution error', async () => {
      mockStagehand.page.act.mockRejectedValueOnce(new Error('Element not found'))

      const context: ExecutionContext = {
        services: {
          browser: {
            getClient: mockGetClient
          }
        }
      }

      const result = await executeBrowserAct(
        { sessionId: 'test-session', action: 'click non-existent button' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Element not found')
    })

    it('should handle getClient error', async () => {
      mockGetClient.mockRejectedValueOnce(new Error('Invalid session ID'))

      const context: ExecutionContext = {
        services: {
          browser: {
            getClient: mockGetClient
          }
        }
      }

      const result = await executeBrowserAct(
        { sessionId: 'invalid-session', action: 'click button' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid session ID')
    })
  })
})
