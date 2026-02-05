import type { ToolDefinition, ExecutionContext, ToolResult } from '../types'

const BROWSER_CLOSE_DESCRIPTION = `
<tool_description>
  <summary>Closes an active browser session. IT IS VERY IMPORTANT TO RUN THIS TOOL AT THE END OF EVERY BROWSER SESSION TO AVOID EXTRA MINUTES CHARGED TO THE USER. This tool must be called after you have completed all your browser-related tasks to properly terminate the session and prevent unnecessary charges.</summary>
  <prerequisites>You must have an active browser session established (sessionId). This should be the last action taken in a browser workflow.</prerequisites>
  <usage>Use this tool when you have completed all browser operations and need to properly terminate the browser session. This is critical for cost management as keeping sessions open incurs charges.</usage>
  <output>Returns confirmation that the browser session has been closed.</output>
</tool_description>
`

export async function executeBrowserClose(
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

    console.info('BrowserClose: Executing', { sessionId })

    // Get Stagehand client for existing session
    const { stagehand } = await context.services.browser.getClient(sessionId)

    // Close the browser session
    await stagehand.close()

    console.info('BrowserClose: Completed successfully', { sessionId })

    return {
      success: true,
      output: JSON.stringify({
        sessionId,
        message: 'Browser session closed successfully'
      }),
      metadata: {
        sessionId
      }
    }
  } catch (error) {
    console.error('BrowserClose: Error executing tool:', error)
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Failed to close browser session'
    }
  }
}

export const BrowserClose: ToolDefinition = {
  type: 'function',
  name: 'BrowserClose',
  description: BROWSER_CLOSE_DESCRIPTION,
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      sessionId: {
        type: 'string',
        description: 'The session ID of the browser session to close.'
      }
    },
    required: ['sessionId']
  },
  strict: false,
  executor: executeBrowserClose
}
