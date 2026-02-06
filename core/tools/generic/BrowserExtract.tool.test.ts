import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BrowserExtract, executeBrowserExtract } from './BrowserExtract.tool'
import type { ExecutionContext, ToolResult } from '../types'

describe('BrowserExtract Tool', () => {
  let mockStagehand: any
  let mockGetClient: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockStagehand = {
      page: {
        extract: vi.fn().mockResolvedValue({
          title: 'Example Page',
          content: 'This is the page content',
          links: ['https://example.com/link1', 'https://example.com/link2']
        })
      }
    }

    mockGetClient = vi.fn().mockResolvedValue({
      stagehand: mockStagehand
    })
  })

  describe('Tool Definition', () => {
    it('should have correct structure', () => {
      expect(BrowserExtract.type).toBe('function')
      expect(BrowserExtract.name).toBe('BrowserExtract')
      expect(BrowserExtract.description).toContain('FOURTH STEP')
      expect(BrowserExtract.strict).toBe(false)
    })

    it('should have correct parameters schema', () => {
      expect(BrowserExtract.parameters).toMatchObject({
        type: 'object',
        additionalProperties: false,
        properties: {
          sessionId: {
            type: 'string',
            description: expect.any(String)
          }
        },
        required: ['sessionId']
      })
    })

    it('should have executor function', () => {
      expect(BrowserExtract.executor).toBe(executeBrowserExtract)
      expect(typeof BrowserExtract.executor).toBe('function')
    })
  })

  describe('executeBrowserExtract', () => {
    it('should successfully extract page data', async () => {
      const sessionId = 'test-session-123'
      const extractedData = {
        title: 'Example Page',
        content: 'This is the page content',
        links: ['https://example.com/link1']
      }

      mockStagehand.page.extract.mockResolvedValueOnce(extractedData)

      const context: ExecutionContext = {
        services: {
          browser: {
            getClient: mockGetClient
          }
        }
      }

      const result = await executeBrowserExtract(
        { sessionId },
        context
      )

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      
      const output = JSON.parse(result.output)
      expect(output.sessionId).toBe(sessionId)
      expect(output.result).toEqual(extractedData)

      expect(mockGetClient).toHaveBeenCalledOnce()
      expect(mockGetClient).toHaveBeenCalledWith(sessionId)
      expect(mockStagehand.page.extract).toHaveBeenCalledOnce()

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

      const result = await executeBrowserExtract(
        { sessionId: 'test-session' },
        context
      )

      expect(result.success).toBe(true)
      expect(trackUsage).toHaveBeenCalledOnce()
      expect(trackUsage).toHaveBeenCalledWith({
        model: 'gpt-5',
        input_tokens: 0,
        output_tokens: 0,
        function_called: 'BrowserExtract',
        trigger: 'browser_extract'
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

      const result = await executeBrowserExtract({}, context)

      expect(result.success).toBe(false)
      expect(result.error).toBe('sessionId is required')
      expect(mockGetClient).not.toHaveBeenCalled()
    })

    it('should handle missing browser service', async () => {
      const context: ExecutionContext = {}

      const result = await executeBrowserExtract(
        { sessionId: 'test-session' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Browser service not configured. Provide context.services.browser.getClient')
    })

    it('should handle extraction error', async () => {
      mockStagehand.page.extract.mockRejectedValueOnce(new Error('Page not loaded'))

      const context: ExecutionContext = {
        services: {
          browser: {
            getClient: mockGetClient
          }
        }
      }

      const result = await executeBrowserExtract(
        { sessionId: 'test-session' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Page not loaded')
    })

    it('should handle getClient error', async () => {
      mockGetClient.mockRejectedValueOnce(new Error('Session expired'))

      const context: ExecutionContext = {
        services: {
          browser: {
            getClient: mockGetClient
          }
        }
      }

      const result = await executeBrowserExtract(
        { sessionId: 'expired-session' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Session expired')
    })
  })
})
