import { describe, it, expect, beforeEach, vi } from 'vitest'
import { executeBrowserNavigate } from './BrowserNavigate.tool'
import { executeBrowserObserve } from './BrowserObserve.tool'
import { executeBrowserAct } from './BrowserAct.tool'
import { executeBrowserExtract } from './BrowserExtract.tool'
import { executeBrowserClose } from './BrowserClose.tool'
import type { ExecutionContext } from '../types'

/**
 * Integration test for the complete browser automation workflow:
 * Navigate → Observe → Act → Extract → Close
 */
describe('Browser Workflow Integration', () => {
  let mockStagehand: any
  let mockGetClient: ReturnType<typeof vi.fn>
  let sessionId: string

  beforeEach(() => {
    sessionId = 'workflow-session-123'

    mockStagehand = {
      page: {
        goto: vi.fn().mockResolvedValue(undefined),
        observe: vi.fn().mockResolvedValue([
          { type: 'button', text: 'Submit', location: 'bottom' },
          { type: 'input', label: 'Email', location: 'center' }
        ]),
        act: vi.fn().mockResolvedValue('Action completed'),
        extract: vi.fn().mockResolvedValue({
          title: 'Example Page',
          content: 'Page content after action',
          formData: { email: 'test@example.com' }
        })
      },
      close: vi.fn().mockResolvedValue(undefined),
      browserbaseSessionID: sessionId
    }

    mockGetClient = vi.fn().mockResolvedValue({
      stagehand: mockStagehand,
      sessionUrl: `https://browserbase.com/session/${sessionId}`
    })
  })

  it('should execute complete workflow: Navigate → Observe → Act → Extract → Close', async () => {
    const trackUsage = vi.fn().mockResolvedValue(undefined)

    const context: ExecutionContext = {
      services: {
        browser: {
          getClient: mockGetClient
        }
      },
      trackUsage
    }

    // Step 1: Navigate
    const navigateResult = await executeBrowserNavigate(
      { url: 'https://example.com' },
      context
    )

    expect(navigateResult.success).toBe(true)
    const navigateOutput = JSON.parse(navigateResult.output)
    const actualSessionId = navigateOutput.sessionId
    expect(actualSessionId).toBe(sessionId)
    expect(mockStagehand.page.goto).toHaveBeenCalledWith('https://example.com')

    // Step 2: Observe
    const observeResult = await executeBrowserObserve(
      { sessionId: actualSessionId, instruction: 'find all buttons and inputs' },
      context
    )

    expect(observeResult.success).toBe(true)
    const observeOutput = JSON.parse(observeResult.output)
    expect(observeOutput.result).toHaveLength(2)
    expect(mockStagehand.page.observe).toHaveBeenCalledWith('find all buttons and inputs')

    // Step 3: Act
    const actResult = await executeBrowserAct(
      { sessionId: actualSessionId, action: 'fill email field with test@example.com' },
      context
    )

    expect(actResult.success).toBe(true)
    const actOutput = JSON.parse(actResult.output)
    expect(actOutput.result).toBe('Action completed')
    expect(mockStagehand.page.act).toHaveBeenCalledWith('fill email field with test@example.com')

    // Step 4: Extract
    const extractResult = await executeBrowserExtract(
      { sessionId: actualSessionId },
      context
    )

    expect(extractResult.success).toBe(true)
    const extractOutput = JSON.parse(extractResult.output)
    expect(extractOutput.result).toMatchObject({
      title: 'Example Page',
      formData: { email: 'test@example.com' }
    })
    expect(mockStagehand.page.extract).toHaveBeenCalled()

    // Step 5: Close
    const closeResult = await executeBrowserClose(
      { sessionId: actualSessionId },
      context
    )

    expect(closeResult.success).toBe(true)
    expect(mockStagehand.close).toHaveBeenCalled()

    // Verify session persistence - getClient should be called with same sessionId throughout
    expect(mockGetClient).toHaveBeenCalledTimes(5)
    expect(mockGetClient).toHaveBeenNthCalledWith(1, undefined) // Navigate creates new session
    expect(mockGetClient).toHaveBeenNthCalledWith(2, sessionId) // Observe uses existing
    expect(mockGetClient).toHaveBeenNthCalledWith(3, sessionId) // Act uses existing
    expect(mockGetClient).toHaveBeenNthCalledWith(4, sessionId) // Extract uses existing
    expect(mockGetClient).toHaveBeenNthCalledWith(5, sessionId) // Close uses existing

    // Verify usage tracking was called for appropriate steps
    expect(trackUsage).toHaveBeenCalledTimes(4) // Navigate (new session), Observe, Act, Extract
    expect(trackUsage).toHaveBeenNthCalledWith(1, {
      model: 'browserbase',
      input_tokens: 0,
      output_tokens: 0,
      function_called: 'BrowserNavigate',
      trigger: 'browser_navigate'
    })
    expect(trackUsage).toHaveBeenNthCalledWith(2, {
      model: 'gpt-5',
      input_tokens: 0,
      output_tokens: 0,
      function_called: 'BrowserObserve',
      trigger: 'browser_observe'
    })
    expect(trackUsage).toHaveBeenNthCalledWith(3, {
      model: 'gpt-5',
      input_tokens: 0,
      output_tokens: 0,
      function_called: 'BrowserAct',
      trigger: 'browser_act'
    })
    expect(trackUsage).toHaveBeenNthCalledWith(4, {
      model: 'gpt-5',
      input_tokens: 0,
      output_tokens: 0,
      function_called: 'BrowserExtract',
      trigger: 'browser_extract'
    })
  })

  it('should handle errors gracefully and allow session cleanup', async () => {
    // Simulate an error during Act step
    mockStagehand.page.act.mockRejectedValueOnce(new Error('Element not found'))

    const context: ExecutionContext = {
      services: {
        browser: {
          getClient: mockGetClient
        }
      }
    }

    // Navigate successfully
    const navigateResult = await executeBrowserNavigate(
      { url: 'https://example.com' },
      context
    )
    expect(navigateResult.success).toBe(true)
    const navigateOutput = JSON.parse(navigateResult.output)
    const actualSessionId = navigateOutput.sessionId

    // Observe successfully
    const observeResult = await executeBrowserObserve(
      { sessionId: actualSessionId, instruction: 'find buttons' },
      context
    )
    expect(observeResult.success).toBe(true)

    // Act fails
    const actResult = await executeBrowserAct(
      { sessionId: actualSessionId, action: 'click non-existent button' },
      context
    )
    expect(actResult.success).toBe(false)
    expect(actResult.error).toBe('Element not found')

    // Should still be able to close the session even after error
    const closeResult = await executeBrowserClose(
      { sessionId: actualSessionId },
      context
    )
    expect(closeResult.success).toBe(true)
    expect(mockStagehand.close).toHaveBeenCalled()
  })

  it('should handle invalid session ID errors', async () => {
    mockGetClient.mockRejectedValueOnce(new Error('Session not found'))

    const context: ExecutionContext = {
      services: {
        browser: {
          getClient: mockGetClient
        }
      }
    }

    // Try to use an invalid session
    const observeResult = await executeBrowserObserve(
      { sessionId: 'invalid-session', instruction: 'find buttons' },
      context
    )

    expect(observeResult.success).toBe(false)
    expect(observeResult.error).toBe('Session not found')
  })
})
