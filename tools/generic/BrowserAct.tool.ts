import type { ToolDefinition, ExecutionContext, ToolResult } from '../types'

const BROWSER_ACT_DESCRIPTION = `
<tool_description>
  <summary>Executes user actions on web pages like clicking buttons, filling forms, and navigating. THIS IS THE THIRD STEP in the browser workflow.</summary>
  <prerequisites>Ensure you have navigated to the target page and the elements you want to interact with exist on the page.</prerequisites>
  <usage>Use when you need to perform user interactions on a webpage such as clicking buttons, submitting forms, entering text, or navigating through pages. Use this after Navigate and Observe to execute the planned actions. This is the third step in the browser workflow.</usage>
  <output>Returns whether the action succeeded and a brief confirmation message.</output>
</tool_description>
`

export async function executeBrowserAct(
  args: Record<string, unknown>,
  context: ExecutionContext
): Promise<ToolResult> {
  const sessionId = args.sessionId as string
  const action = args.action as string

  try {
    if (!sessionId) {
      return {
        success: false,
        output: '',
        error: 'sessionId is required'
      }
    }

    if (!action) {
      return {
        success: false,
        output: '',
        error: 'action is required'
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

    console.info('BrowserAct: Executing', { sessionId, action })

    // Get Stagehand client for existing session
    const { stagehand } = await context.services.browser.getClient(sessionId)

    // Perform the action
    const result = await stagehand.page.act(action)

    // Track usage if callback is provided
    if (context.trackUsage) {
      await context.trackUsage({
        model: 'gpt-5',
        input_tokens: 0,
        output_tokens: 0,
        function_called: 'BrowserAct',
        trigger: 'browser_act'
      })
    }

    console.info('BrowserAct: Completed successfully', { sessionId })

    return {
      success: true,
      output: JSON.stringify({
        sessionId,
        result
      }),
      metadata: {
        sessionId
      }
    }
  } catch (error) {
    console.error('BrowserAct: Error executing tool:', error)
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Failed to execute browser act'
    }
  }
}

export const BrowserAct: ToolDefinition = {
  type: 'function',
  name: 'BrowserAct',
  description: BROWSER_ACT_DESCRIPTION,
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      sessionId: {
        type: 'string',
        description: 'The session ID to use for the browser act.'
      },
      action: {
        type: 'string',
        description: 'The action to perform on the page, described in natural language (e.g., "click the login button", "type hello in the search box").'
      }
    },
    required: ['sessionId', 'action']
  },
  strict: false,
  executor: executeBrowserAct
}
