import type {
  CloudAgent,
  HistoryItem,
  AgentProcessResult,
  ControllerOptions
} from '../types'
import { buildAgentSystemPrompt } from '../prompts/systemPrompt'

const DEFAULT_MODEL = 'gpt-4.1'

/**
 * Handles the 'running' status - calls LLM and determines next status
 * @param agent - The agent being processed
 * @param history - Current conversation history
 * @param options - Controller options including providers
 * @returns Updated history and status
 */
export async function running(
  agent: CloudAgent,
  history: HistoryItem[],
  options: ControllerOptions
): Promise<AgentProcessResult> {
  const logger = options.logger || console
  const analytics = options.analyticsProvider
  const model = agent.model || options.defaultModel || DEFAULT_MODEL

  logger.info('Agent controller processing running agent', {
    projectId: agent.projectId,
    model,
    toolsCount: agent.tools?.length || 0
  })

  try {
    // Load rulebook if database provider is available
    let rulebookData: Array<{ content: string }> = []
    if (options.databaseProvider) {
      rulebookData = await options.databaseProvider.getRulebook(agent.projectId)
    }

    // Build system prompt
    // If no config provided in options, uses default behavior (all sections included)
    // If config provided, uses presence/absence pattern (only include what's specified)
    const systemPrompt = buildAgentSystemPrompt(agent, rulebookData, options.systemPromptConfig)

    // Get available tools from registry
    const availableTools = options.toolRegistry.getAvailable()

    // Call LLM
    const result = await options.llmProvider.call({
      projectId: agent.projectId,
      model,
      history: [
        {
          role: 'system',
          type: 'message',
          content: systemPrompt
        },
        ...history
      ],
      tools: availableTools,
      agentId: agent.id
    })

    const { output, history: updatedHistoryRaw, usage } = result

    // Filter out system messages from history
    const updatedHistory = updatedHistoryRaw.filter((item) => item.role !== 'system')

    // Calculate context tokens (input + output tokens)
    const contextTokens = usage ? usage.input_tokens + usage.output_tokens : undefined

    // Determine next status based on output type
    if (output.type === 'function_call') {
      const name = output.name || ''
      const hotlTools = options.hotlTools || new Set<string>()

      // If the tool is a HOTL tool, await human input
      if (hotlTools.has(name)) {
        logger.info('Agent controller awaiting human input for HOTL tool', {
          projectId: agent.projectId,
          functionName: name
        })
        return { history: updatedHistory, status: 'awaiting_human', contextTokens }
      }

      // Otherwise, await tool execution
      logger.info('Agent controller awaiting tool call', {
        projectId: agent.projectId,
        functionName: name
      })
      return { history: updatedHistory, status: 'awaiting_tool', contextTokens }
    }

    // If the output is a message, pause the agent
    logger.info('Agent controller pausing agent', {
      projectId: agent.projectId,
      outputType: output.type
    })

    // Track the running status event AFTER processing
    if (analytics) {
      analytics.track('agent_message_generated', {
        projectId: agent.projectId,
        agentId: agent.id,
        model,
        output_type: output.type
      })
    }

    return { history: updatedHistory, status: 'paused', contextTokens }
  } catch (e) {
    // If the agent fails, return an error
    logger.error('Agent controller failed during LLM processing', {
      projectId: agent.projectId,
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined
    })

    // Track agent processing error
    if (analytics) {
      analytics.track('agent_message_error', {
        projectId: agent.projectId,
        agentId: agent.id,
        model,
        error: e instanceof Error ? e.message : String(e)
      })
    }

    return { history, status: 'error', error: e instanceof Error ? e.message : String(e) }
  }
}
