import type { ToolDefinition, ExecutionContext, ToolResult } from '../types'

const BROWSER_OBSERVE_DESCRIPTION = `
<tool_description>
  <summary>Discovers and catalogs interactive elements on web pages to understand their structure and behavior. THIS IS THE SECOND STEP in the browser workflow after Navigate.</summary>
  <prerequisites>Ensure you have navigated to the target page. Specify what types of elements or features you want to identify on the page.</prerequisites>
  <usage>Use to explore webpage structure before automating interactions, understand what elements are available, map out navigation flows, or analyze competitor interfaces. Describes buttons, forms, links, and other interactive elements with their properties and locations. Use this after Navigate to plan your actions, then use Act to perform those actions.</usage>
  <output>Returns a detailed list of discovered elements with their descriptions, properties (text, labels, types), and approximate locations.</output>
</tool_description>
`

export async function executeBrowserObserve(
  args: Record<string, unknown>,
  context: ExecutionContext
): Promise<ToolResult> {
  const sessionId = args.sessionId as string
  const instruction = args.instruction as string

  try {
    if (!sessionId) {
      return {
        success: false,
        output: '',
        error: 'sessionId is required'
      }
    }

    if (!instruction) {
      return {
        success: false,
        output: '',
        error: 'instruction is required'
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

    console.info('BrowserObserve: Executing', { sessionId, instruction })

    // Get Stagehand client for existing session
    const { stagehand } = await context.services.browser.getClient(sessionId)

    // Observe the page according to the instruction
    const observations = await stagehand.page.observe(instruction)

    // Track usage if callback is provided
    if (context.trackUsage) {
      await context.trackUsage({
        model: 'gpt-5',
        input_tokens: 0,
        output_tokens: 0,
        function_called: 'BrowserObserve',
        trigger: 'browser_observe'
      })
    }

    console.info('BrowserObserve: Completed successfully', { sessionId })

    return {
      success: true,
      output: JSON.stringify({
        sessionId,
        result: observations
      }),
      metadata: {
        sessionId
      }
    }
  } catch (error) {
    console.error('BrowserObserve: Error executing tool:', error)
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Failed to observe browser'
    }
  }
}

export const BrowserObserve: ToolDefinition = {
  type: 'function',
  name: 'BrowserObserve',
  description: BROWSER_OBSERVE_DESCRIPTION,
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      sessionId: {
        type: 'string',
        description: 'The session ID to use for the browser observe.'
      },
      instruction: {
        type: 'string',
        description: 'Instructions describing what to observe on the page (e.g., "find all clickable buttons", "identify all input fields").'
      }
    },
    required: ['sessionId', 'instruction']
  },
  strict: false,
  executor: executeBrowserObserve
}
