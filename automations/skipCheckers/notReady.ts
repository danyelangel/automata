import type { Automation, SkipResult } from '../../types/automation'

/**
 * Check if automation is not ready to run (hasn't reached start date)
 */
export function checkNotReady (
  automation: Automation,
  automationId: string,
  now: number
): SkipResult {
  if (now < automation.startDate) {
    return {
      shouldSkip: true,
      reason: `Automation ${automation.name} (${automationId}) is not ready to run, skipping`,
      reasonType: 'not_ready'
    }
  }

  return { shouldSkip: false }
}
