import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BrowserNavigate, executeBrowserNavigate } from './BrowserNavigate.tool'
import type { ExecutionContext, ToolResult } from '../types'

describe('BrowserNavigate Tool', () => {
  let mockStagehand: any
  let mockGetClient: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockStagehand = {
      page: {
        goto: vi.fn().mockResolvedValue(undefined)
      },
      browserbaseSessionID: 'test-session-id-123'
    }

    mockGetClient = vi.fn().mockResolvedValue({
      stagehand: mockStagehand,
      sessionUrl: 'https://browserbase.com/session/test-session-id-123'
    })
  })

  describe('Tool Definition', () => {
    it('should have correct structure', () => {
      expect(BrowserNavigate.type).toBe('function')
      expect(BrowserNavigate.name).toBe('BrowserNavigate')
      expect(BrowserNavigate.description).toContain('FIRST STEP')
      expect(BrowserNavigate.strict).toBe(false)
    })

    it('should have correct parameters schema', () => {
      expect(BrowserNavigate.parameters).toMatchObject({
        type: 'object',
        additionalProperties: false,
        properties: {
          sessionId: {
            type: 'string',
            description: expect.any(String)
          },
          url: {
            type: 'string',
            description: expect.any(String)
          }
        },
        required: ['url']
      })
    })

    it('should have executor function', () => {
      expect(BrowserNavigate.executor).toBe(executeBrowserNavigate)
      expect(typeof BrowserNavigate.executor).toBe('function')
    })
  })

  describe('executeBrowserNavigate', () => {
    it('should successfully navigate to URL with new session', async () => {
      const context: ExecutionContext = {
        services: {
          browser: {
            getClient: mockGetClient
          }
        }
      }

      const result = await executeBrowserNavigate(
        { url: 'https://example.com' },
        context
      )

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      
      const output = JSON.parse(result.output)
      expect(output.sessionId).toBe('test-session-id-123')
      expect(output.url).toBe('https://example.com')
      expect(output.sessionUrl).toBe('https://browserbase.com/session/test-session-id-123')

      expect(mockGetClient).toHaveBeenCalledOnce()
      expect(mockGetClient).toHaveBeenCalledWith(undefined)
      expect(mockStagehand.page.goto).toHaveBeenCalledOnce()
      expect(mockStagehand.page.goto).toHaveBeenCalledWith('https://example.com')

      expect(result.metadata).toMatchObject({
        sessionId: 'test-session-id-123',
        isNewSession: true
      })
    })

    it('should successfully navigate with existing session', async () => {
      const existingSessionId = 'existing-session-456'
      mockStagehand.browserbaseSessionID = existingSessionId

      const context: ExecutionContext = {
        services: {
          browser: {
            getClient: mockGetClient
          }
        }
      }

      const result = await executeBrowserNavigate(
        { sessionId: existingSessionId, url: 'https://example.com' },
        context
      )

      expect(result.success).toBe(true)
      
      const output = JSON.parse(result.output)
      expect(output.sessionId).toBe(existingSessionId)
      expect(output.sessionUrl).toBeUndefined()

      expect(mockGetClient).toHaveBeenCalledWith(existingSessionId)
      expect(result.metadata).toMatchObject({
        sessionId: existingSessionId,
        isNewSession: false
      })
    })

    it('should track usage for new sessions', async () => {
      const trackUsage = vi.fn().mockResolvedValue(undefined)

      const context: ExecutionContext = {
        services: {
          browser: {
            getClient: mockGetClient
          }
        },
        trackUsage
      }

      const result = await executeBrowserNavigate(
        { url: 'https://example.com' },
        context
      )

      expect(result.success).toBe(true)
      expect(trackUsage).toHaveBeenCalledOnce()
      expect(trackUsage).toHaveBeenCalledWith({
        model: 'browserbase',
        input_tokens: 0,
        output_tokens: 0,
        function_called: 'BrowserNavigate',
        trigger: 'browser_navigate'
      })
    })

    it('should not track usage for existing sessions', async () => {
      const trackUsage = vi.fn().mockResolvedValue(undefined)

      const context: ExecutionContext = {
        services: {
          browser: {
            getClient: mockGetClient
          }
        },
        trackUsage
      }

      const result = await executeBrowserNavigate(
        { sessionId: 'existing-session', url: 'https://example.com' },
        context
      )

      expect(result.success).toBe(true)
      expect(trackUsage).not.toHaveBeenCalled()
    })

    it('should handle missing URL', async () => {
      const context: ExecutionContext = {
        services: {
          browser: {
            getClient: mockGetClient
          }
        }
      }

      const result = await executeBrowserNavigate({}, context)

      expect(result.success).toBe(false)
      expect(result.error).toBe('URL is required')
      expect(mockGetClient).not.toHaveBeenCalled()
    })

    it('should handle missing browser service', async () => {
      const context: ExecutionContext = {}

      const result = await executeBrowserNavigate(
        { url: 'https://example.com' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Browser service not configured. Provide context.services.browser.getClient')
    })

    it('should handle browser service without getClient', async () => {
      const context: ExecutionContext = {
        services: {
          browser: {} as any
        }
      }

      const result = await executeBrowserNavigate(
        { url: 'https://example.com' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Browser service not configured. Provide context.services.browser.getClient')
    })

    it('should handle navigation error', async () => {
      mockStagehand.page.goto.mockRejectedValueOnce(new Error('Navigation failed'))

      const context: ExecutionContext = {
        services: {
          browser: {
            getClient: mockGetClient
          }
        }
      }

      const result = await executeBrowserNavigate(
        { url: 'https://example.com' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Navigation failed')
    })

    it('should handle getClient error', async () => {
      mockGetClient.mockRejectedValueOnce(new Error('Failed to initialize browser'))

      const context: ExecutionContext = {
        services: {
          browser: {
            getClient: mockGetClient
          }
        }
      }

      const result = await executeBrowserNavigate(
        { url: 'https://example.com' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to initialize browser')
    })
  })
})
