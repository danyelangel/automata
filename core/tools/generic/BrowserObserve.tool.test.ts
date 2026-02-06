import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BrowserObserve, executeBrowserObserve } from './BrowserObserve.tool'
import type { ExecutionContext, ToolResult } from '../types'

describe('BrowserObserve Tool', () => {
  let mockStagehand: any
  let mockGetClient: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockStagehand = {
      page: {
        observe: vi.fn().mockResolvedValue([
          {
            type: 'button',
            text: 'Login',
            location: 'top-right'
          },
          {
            type: 'input',
            label: 'Email',
            location: 'center'
          }
        ])
      }
    }

    mockGetClient = vi.fn().mockResolvedValue({
      stagehand: mockStagehand
    })
  })

  describe('Tool Definition', () => {
    it('should have correct structure', () => {
      expect(BrowserObserve.type).toBe('function')
      expect(BrowserObserve.name).toBe('BrowserObserve')
      expect(BrowserObserve.description).toContain('SECOND STEP')
      expect(BrowserObserve.strict).toBe(false)
    })

    it('should have correct parameters schema', () => {
      expect(BrowserObserve.parameters).toMatchObject({
        type: 'object',
        additionalProperties: false,
        properties: {
          sessionId: {
            type: 'string',
            description: expect.any(String)
          },
          instruction: {
            type: 'string',
            description: expect.any(String)
          }
        },
        required: ['sessionId', 'instruction']
      })
    })

    it('should have executor function', () => {
      expect(BrowserObserve.executor).toBe(executeBrowserObserve)
      expect(typeof BrowserObserve.executor).toBe('function')
    })
  })

  describe('executeBrowserObserve', () => {
    it('should successfully observe page elements', async () => {
      const sessionId = 'test-session-123'
      const instruction = 'find all clickable buttons'
      const observations = [
        { type: 'button', text: 'Submit', location: 'bottom' },
        { type: 'button', text: 'Cancel', location: 'bottom' }
      ]

      mockStagehand.page.observe.mockResolvedValueOnce(observations)

      const context: ExecutionContext = {
        services: {
          browser: {
            getClient: mockGetClient
          }
        }
      }

      const result = await executeBrowserObserve(
        { sessionId, instruction },
        context
      )

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      
      const output = JSON.parse(result.output)
      expect(output.sessionId).toBe(sessionId)
      expect(output.result).toEqual(observations)

      expect(mockGetClient).toHaveBeenCalledOnce()
      expect(mockGetClient).toHaveBeenCalledWith(sessionId)
      expect(mockStagehand.page.observe).toHaveBeenCalledOnce()
      expect(mockStagehand.page.observe).toHaveBeenCalledWith(instruction)

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

      const result = await executeBrowserObserve(
        { sessionId: 'test-session', instruction: 'find buttons' },
        context
      )

      expect(result.success).toBe(true)
      expect(trackUsage).toHaveBeenCalledOnce()
      expect(trackUsage).toHaveBeenCalledWith({
        model: 'gpt-5',
        input_tokens: 0,
        output_tokens: 0,
        function_called: 'BrowserObserve',
        trigger: 'browser_observe'
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

      const result = await executeBrowserObserve(
        { instruction: 'find buttons' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('sessionId is required')
      expect(mockGetClient).not.toHaveBeenCalled()
    })

    it('should handle missing instruction', async () => {
      const context: ExecutionContext = {
        services: {
          browser: {
            getClient: mockGetClient
          }
        }
      }

      const result = await executeBrowserObserve(
        { sessionId: 'test-session' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('instruction is required')
      expect(mockGetClient).not.toHaveBeenCalled()
    })

    it('should handle missing browser service', async () => {
      const context: ExecutionContext = {}

      const result = await executeBrowserObserve(
        { sessionId: 'test-session', instruction: 'find buttons' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Browser service not configured. Provide context.services.browser.getClient')
    })

    it('should handle observation error', async () => {
      mockStagehand.page.observe.mockRejectedValueOnce(new Error('Page not accessible'))

      const context: ExecutionContext = {
        services: {
          browser: {
            getClient: mockGetClient
          }
        }
      }

      const result = await executeBrowserObserve(
        { sessionId: 'test-session', instruction: 'find buttons' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Page not accessible')
    })

    it('should handle getClient error', async () => {
      mockGetClient.mockRejectedValueOnce(new Error('Invalid session'))

      const context: ExecutionContext = {
        services: {
          browser: {
            getClient: mockGetClient
          }
        }
      }

      const result = await executeBrowserObserve(
        { sessionId: 'invalid-session', instruction: 'find buttons' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid session')
    })
  })
})
