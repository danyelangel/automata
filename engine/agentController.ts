import type {
  CloudAgent,
  AgentProcessResult,
  ControllerOptions
} from './types'
import { running, awaiting_tool } from './statuses'

/**
 * Processes an agent through its current status
 * @param agent - The agent to process
 * @param options - Controller options including providers and configuration
 * @returns The result of processing (history, status, error) or false if agent shouldn't be processed
 */
export async function processAgentController(
  agent: CloudAgent,
  options: ControllerOptions
): Promise<AgentProcessResult | false> {
  const logger = options.logger || console

  if (!agent) {
    logger.warn('Agent controller received null/undefined agent')
    return false
  }

  logger.info('Starting agent controller processing', {
    projectId: agent.projectId,
    currentStatus: agent.status,
    historyLength: agent.history?.length || 0
  })

  const history = agent.history || []

  // Check if agent should not be processed
  if (agent.status && ['paused', 'awaiting_human'].includes(agent.status)) {
    logger.info('Agent controller is: ' + agent.status, {
      projectId: agent.projectId,
      status: agent.status
    })
    return false
  }

  const lastMessage = history[history.length - 1]
  const MESSAGE_PAUSE_THRESHOLD = options.messagePauseThreshold || 4

  // Check if the last MESSAGE_PAUSE_THRESHOLD messages are all from the assistant
  if (lastMessage && lastMessage.type === 'message' && lastMessage.role !== 'user') {
    const lastNMessages = history.slice(-MESSAGE_PAUSE_THRESHOLD)
    const allLastNAreAssistantMessages = lastNMessages.length === MESSAGE_PAUSE_THRESHOLD &&
      lastNMessages.every(msg => msg.type === 'message' && msg.role !== 'user')

    if (allLastNAreAssistantMessages) {
      logger.info('Agent controller pausing - last ' + MESSAGE_PAUSE_THRESHOLD + ' history items are messages from assistant', {
        projectId: agent.projectId,
        lastMessageType: lastMessage.type,
        lastNMessageTypes: lastNMessages.map(msg => msg.type)
      })
      return { history, status: 'paused' }
    }
  }

  // Dispatch to appropriate status handler
  if (agent.status === 'running') {
    return running(agent, history, options)
  }

  if (agent.status === 'awaiting_tool') {
    return awaiting_tool(agent, history, options)
  }

  logger.warn('Agent controller reached end without processing - unknown status', {
    projectId: agent.projectId,
    status: agent.status
  })
  return false
}
