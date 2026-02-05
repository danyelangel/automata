import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BrowserClose, executeBrowserClose } from './BrowserClose.tool'
import type { ExecutionContext, ToolResult } from '../types'

describe('BrowserClose Tool', () => {
  let mockStagehand: any
  let mockGetClient: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockStagehand = {
      close: vi.fn().mockResolvedValue(undefined)
    }

    mockGetClient = vi.fn().mockResolvedValue({
      stagehand: mockStagehand
    })
  })

  describe('Tool Definition', () => {
    it('should have correct structure', () => {
      expect(BrowserClose.type).toBe('function')
      expect(BrowserClose.name).toBe('BrowserClose')
      expect(BrowserClose.description).toContain('VERY IMPORTANT')
      expect(BrowserClose.strict).toBe(false)
    })

    it('should have correct parameters schema', () => {
      expect(BrowserClose.parameters).toMatchObject({
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
      expect(BrowserClose.executor).toBe(executeBrowserClose)
      expect(typeof BrowserClose.executor).toBe('function')
    })
  })

  describe('executeBrowserClose', () => {
    it('should successfully close browser session', async () => {
      const sessionId = 'test-session-123'

      const context: ExecutionContext = {
        services: {
          browser: {
            getClient: mockGetClient
          }
        }
      }

      const result = await executeBrowserClose(
        { sessionId },
        context
      )

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      
      const output = JSON.parse(result.output)
      expect(output.sessionId).toBe(sessionId)
      expect(output.message).toBe('Browser session closed successfully')

      expect(mockGetClient).toHaveBeenCalledOnce()
      expect(mockGetClient).toHaveBeenCalledWith(sessionId)
      expect(mockStagehand.close).toHaveBeenCalledOnce()

      expect(result.metadata).toMatchObject({
        sessionId
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

      const result = await executeBrowserClose({}, context)

      expect(result.success).toBe(false)
      expect(result.error).toBe('sessionId is required')
      expect(mockGetClient).not.toHaveBeenCalled()
    })

    it('should handle missing browser service', async () => {
      const context: ExecutionContext = {}

      const result = await executeBrowserClose(
        { sessionId: 'test-session' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Browser service not configured. Provide context.services.browser.getClient')
    })

    it('should handle close error', async () => {
      mockStagehand.close.mockRejectedValueOnce(new Error('Failed to close session'))

      const context: ExecutionContext = {
        services: {
          browser: {
            getClient: mockGetClient
          }
        }
      }

      const result = await executeBrowserClose(
        { sessionId: 'test-session' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to close session')
    })

    it('should handle getClient error', async () => {
      mockGetClient.mockRejectedValueOnce(new Error('Session not found'))

      const context: ExecutionContext = {
        services: {
          browser: {
            getClient: mockGetClient
          }
        }
      }

      const result = await executeBrowserClose(
        { sessionId: 'non-existent-session' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Session not found')
    })
  })
})
