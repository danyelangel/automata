import type { Automation, SkipResult } from '../../types/automation'

/**
 * Calculate the time threshold based on frequency
 */
export function getTimeThreshold (frequency: string, now: number): number {
  const oneDay = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

  switch (frequency) {
    case 'every_5_minutes':
      return now - 5 * 60 * 1000
    case 'every_10_minutes':
      return now - 10 * 60 * 1000
    case 'every_15_minutes':
      return now - 15 * 60 * 1000
    case 'every_30_minutes':
      return now - 30 * 60 * 1000
    case 'every_1_hour':
      return now - 60 * 60 * 1000
    case 'every_3_hours':
      return now - 3 * 60 * 60 * 1000
    case 'every_6_hours':
      return now - 6 * 60 * 60 * 1000
    case 'every_12_hours':
      return now - 12 * 60 * 60 * 1000
    case 'daily':
      return now - oneDay
    case 'every_2_days':
      return now - 2 * oneDay
    case 'every_4_days':
      return now - 4 * oneDay
    case 'weekly':
      return now - 7 * oneDay
    case 'every_2_weeks':
      return now - 14 * oneDay
    case 'monthly':
      return now - 30 * oneDay
    default:
      return now - oneDay
  }
}

/**
 * Check if automation ran recently (not enough time has passed since last run)
 */
export function checkRunRecently (
  automation: Automation,
  automationId: string,
  now: number
): SkipResult {
  const timeThreshold = getTimeThreshold(automation.frequency, now)
  const lastRun = automation.lastRun || 0
  const leeway = 1 * 60 * 1000 // 1 minute in milliseconds

  const isAutomationRunRecently = automation.frequency !== 'once' && (lastRun - leeway >= timeThreshold)

  if (isAutomationRunRecently) {
    return {
      shouldSkip: true,
      reason: `Automation ${automation.name} (${automationId}) was run recently, skipping`,
      reasonType: 'run_recently'
    }
  }

  return { shouldSkip: false }
}
