import type { Automation, SkipResult } from '../../types/automation'

/**
 * Check if one-time automation has already run
 */
export function checkAlreadyRun (
  automation: Automation,
  automationId: string
): SkipResult {
  const isOneTimeAutomationAlreadyRun = automation.frequency === 'once' && automation.lastRun

  if (isOneTimeAutomationAlreadyRun) {
    return {
      shouldSkip: true,
      reason: `Automation ${automation.name} (${automationId}) has already run, skipping`,
      reasonType: 'already_run'
    }
  }

  return { shouldSkip: false }
}
