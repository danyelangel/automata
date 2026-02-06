import type { ToolDefinition, ExecutionContext, ToolResult } from '../types'

const BROWSER_EXTRACT_DESCRIPTION = `
<tool_description>
  <summary>Captures a full snapshot of the current browser page content. THIS IS THE FOURTH STEP in the browser workflow.</summary>
  <prerequisites>You must already be on the target webpage using the browser session. Use this after navigating to a page to get a complete snapshot of its contents.</prerequisites>
  <usage>Use to capture the full content of the current browser page for analysis. This is the fourth and final step in the browser workflow. Returns a complete snapshot of the page including text content, structure, and available data. Use this after Navigate, Observe, and Act to capture the final state of the page.</usage>
  <output>Returns a full snapshot of the current page content, including text and structure.</output>
</tool_description>
`

export async function executeBrowserExtract(
  args: Record<string, unknown>,
  context: ExecutionContext
): Promise<ToolResult> {
  const sessionId = args.sessionId as string

  try {
    if (!sessionId) {
      return {
        success: false,
        output: '',
        error: 'sessionId is required'
      }
    }

    // Get browser client from context
    if (!context.services?.browser?.getClient) {
      return {
        success: false,
        output: '',
        error: 'Browser service not configured. Provide context.services.browser.getClient'
      }
    }

    console.info('BrowserExtract: Executing', { sessionId })

    // Get Stagehand client for existing session
    const { stagehand } = await context.services.browser.getClient(sessionId)

    // Extract data from the page
    const extractedData = await stagehand.page.extract()

    // Track usage if callback is provided
    if (context.trackUsage) {
      await context.trackUsage({
        model: 'gpt-5',
        input_tokens: 0,
        output_tokens: 0,
        function_called: 'BrowserExtract',
        trigger: 'browser_extract'
      })
    }

    console.info('BrowserExtract: Completed successfully', { sessionId })

    return {
      success: true,
      output: JSON.stringify({
        sessionId,
        result: extractedData
      }),
      metadata: {
        sessionId
      }
    }
  } catch (error) {
    console.error('BrowserExtract: Error executing tool:', error)
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Failed to extract from browser'
    }
  }
}

export const BrowserExtract: ToolDefinition = {
  type: 'function',
  name: 'BrowserExtract',
  description: BROWSER_EXTRACT_DESCRIPTION,
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      sessionId: {
        type: 'string',
        description: 'The session ID to use for the browser extract.'
      }
    },
    required: ['sessionId']
  },
  strict: false,
  executor: executeBrowserExtract
}
