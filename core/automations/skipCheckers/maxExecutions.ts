import type { Automation, SkipResult } from '../../types/automation'

/**
 * Check if automation has reached maximum number of executions
 */
export function checkMaxExecutions (
  automation: Automation,
  automationId: string
): SkipResult {
  const hasReachedMaxExecutions = (automation.executions || 0) >= (automation.maxExecutions || Infinity)

  if (hasReachedMaxExecutions) {
    return {
      shouldSkip: true,
      reason: `Automation ${automation.name} (${automationId}) has reached the maximum number of executions, skipping`,
      reasonType: 'max_executions'
    }
  }

  return { shouldSkip: false }
}
