import type { ToolDefinition, ExecutionContext, ToolResult } from '../types'

const BROWSER_NAVIGATE_DESCRIPTION = `
<tool_description>
  <summary>Navigates the browser to a specific URL within a browser session. THIS IS THE FIRST STEP in the browser workflow.</summary>
  <prerequisites>The URL must be valid and accessible. Optionally provide a sessionId if you already have an active session.</prerequisites>
  <usage>Use to navigate to a specific webpage within an existing browser session or to start a new one. This is the first step in the browser automation workflow. After navigation, use Observe to explore the page, then Act to interact with it, and finally Extract to capture the data.</usage>
  <output>Returns confirmation that navigation to the URL was successful and returns the sessionId to use for subsequent operations.</output>
</tool_description>
`

export async function executeBrowserNavigate(
  args: Record<string, unknown>,
  context: ExecutionContext
): Promise<ToolResult> {
  const sessionId = args.sessionId as string | undefined
  const url = args.url as string

  try {
    if (!url) {
      return {
        success: false,
        output: '',
        error: 'URL is required'
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

    console.info('BrowserNavigate: Executing', { sessionId, url })

    // Initialize Stagehand client
    const { stagehand, sessionUrl } = await context.services.browser.getClient(sessionId)

    // Navigate to the URL
    await stagehand.page.goto(url)

    const newSessionId = sessionId || stagehand.browserbaseSessionID

    // Track usage if callback is provided (only for new sessions)
    if (!sessionId && context.trackUsage) {
      await context.trackUsage({
        model: 'browserbase',
        input_tokens: 0,
        output_tokens: 0,
        function_called: 'BrowserNavigate',
        trigger: 'browser_navigate'
      })
    }

    console.info('BrowserNavigate: Completed successfully', { sessionId: newSessionId })

    return {
      success: true,
      output: JSON.stringify({
        sessionId: newSessionId,
        url,
        sessionUrl: sessionId ? undefined : sessionUrl
      }),
      metadata: {
        sessionId: newSessionId,
        isNewSession: !sessionId
      }
    }
  } catch (error) {
    console.error('BrowserNavigate: Error executing tool:', error)
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Failed to navigate browser'
    }
  }
}

export const BrowserNavigate: ToolDefinition = {
  type: 'function',
  name: 'BrowserNavigate',
  description: BROWSER_NAVIGATE_DESCRIPTION,
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      sessionId: {
        type: 'string',
        description: 'The session ID to use for the browser navigation. Optional if starting a new session.'
      },
      url: {
        type: 'string',
        description: 'The URL to navigate to.'
      }
    },
    required: ['url']
  },
  strict: false,
  executor: executeBrowserNavigate
}
