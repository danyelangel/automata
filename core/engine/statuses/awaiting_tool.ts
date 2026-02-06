import type {
  CloudAgent,
  HistoryItem,
  AgentProcessResult,
  ControllerOptions
} from '../types'

/**
 * Handles the 'awaiting_tool' status - executes the tool and returns to running
 * @param agent - The agent being processed
 * @param history - Current conversation history
 * @param options - Controller options including providers
 * @returns Updated history and status
 */
export async function awaiting_tool(
  agent: CloudAgent,
  history: HistoryItem[],
  options: ControllerOptions
): Promise<AgentProcessResult> {
  const logger = options.logger || console
  const analytics = options.analyticsProvider

  logger.info('Agent controller processing awaiting_tool status', {
    projectId: agent.projectId
  })

  // Get the last item in history (should be the function call)
  const output = history[history.length - 1]
  const args = JSON.parse(output.arguments || '{}')
  const name = output.name || ''
  const callId = output.call_id || ''

  logger.debug('Agent controller executing tool', {
    projectId: agent.projectId,
    toolName: name,
    callId,
    args: Object.keys(args)
  })

  try {
    // Execute the tool using the tool registry
    const result = await options.toolRegistry.execute(name, args, {
      agent: {
        id: agent.id,
        projectId: agent.projectId,
        model: agent.model
      }
    })

    // Handle errors from tool execution
    if (!result.success || result.error) {
      logger.info('Agent controller tool execution failed', {
        projectId: agent.projectId,
        toolName: name,
        callId,
        error: result.error
      })

      history.push({
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify({ error: result.error }),
        status: 'completed'
      })
      return { history, status: 'running' }
    }

    logger.info('Agent controller tool execution completed', {
      projectId: agent.projectId,
      tool: name,
      callId,
      resultType: typeof result.output
    })

    // Track the awaiting_tool status event AFTER tool execution
    if (analytics) {
      analytics.track('agent_tool_executed', {
        projectId: agent.projectId,
        tool: name,
        callId,
        agentId: agent.id
      })
    }

    // Parse the output if it's a string, otherwise use it as-is
    let outputData: unknown
    try {
      outputData = typeof result.output === 'string' ? JSON.parse(result.output) : result.output
    } catch {
      outputData = result.output
    }

    history.push({
      type: 'function_call_output',
      call_id: callId,
      output: JSON.stringify(outputData),
      status: 'completed'
    })
    return { history, status: 'running' }
  } catch (e) {
    logger.error('Agent controller tool execution failed', {
      projectId: agent.projectId,
      toolName: name,
      callId,
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined
    })

    // Track tool execution error
    if (analytics) {
      analytics.track('agent_tool_error', {
        projectId: agent.projectId,
        tool: name,
        callId,
        agentId: agent.id,
        error: e instanceof Error ? e.message : String(e)
      })
    }

    history.push({
      type: 'function_call_output',
      call_id: callId,
      output: JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      status: 'failed'
    })
    return { history, status: 'error' }
  }
}
