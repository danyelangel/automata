import { checkRunRecently, getTimeThreshold } from './runRecently'
import type { Automation } from '../../types/automation'

describe('getTimeThreshold', () => {
  const now = 1000000000000 // Fixed timestamp

  it.each([
    ['every_5_minutes', 5 * 60 * 1000],
    ['every_10_minutes', 10 * 60 * 1000],
    ['every_15_minutes', 15 * 60 * 1000],
    ['every_30_minutes', 30 * 60 * 1000],
    ['every_1_hour', 60 * 60 * 1000],
    ['every_3_hours', 3 * 60 * 60 * 1000],
    ['every_6_hours', 6 * 60 * 60 * 1000],
    ['every_12_hours', 12 * 60 * 60 * 1000],
    ['daily', 24 * 60 * 60 * 1000],
    ['every_2_days', 2 * 24 * 60 * 60 * 1000],
    ['every_4_days', 4 * 24 * 60 * 60 * 1000],
    ['weekly', 7 * 24 * 60 * 60 * 1000],
    ['every_2_weeks', 14 * 24 * 60 * 60 * 1000],
    ['monthly', 30 * 24 * 60 * 60 * 1000]
  ])('should calculate correct threshold for %s', (frequency, expectedOffset) => {
    const threshold = getTimeThreshold(frequency, now)
    expect(threshold).toBe(now - expectedOffset)
  })

  it('should default to daily for unknown frequency', () => {
    const threshold = getTimeThreshold('unknown', now)
    const oneDay = 24 * 60 * 60 * 1000
    expect(threshold).toBe(now - oneDay)
  })
})

describe('checkRunRecently', () => {
  const baseAutomation: Automation = {
    name: 'Test Automation',
    projectId: 'project-123',
    frequency: 'daily',
    enabled: true,
    prompt: 'test prompt',
    startDate: Date.now(),
    maxExecutions: 10
  }

  it('should skip when automation ran recently', () => {
    const now = Date.now()
    const automation: Automation = {
      ...baseAutomation,
      frequency: 'daily',
      lastRun: now - 1000 * 60 * 30 // 30 minutes ago (within 24 hours)
    }
    const automationId = 'auto-123'

    const result = checkRunRecently(automation, automationId, now)

    expect(result.shouldSkip).toBe(true)
    expect(result.reasonType).toBe('run_recently')
    expect(result.reason).toContain('was run recently')
  })

  it('should not skip when enough time has passed', () => {
    const now = Date.now()
    const automation: Automation = {
      ...baseAutomation,
      frequency: 'every_5_minutes',
      lastRun: now - 1000 * 60 * 10 // 10 minutes ago (more than 5 minutes)
    }
    const automationId = 'auto-123'

    const result = checkRunRecently(automation, automationId, now)

    expect(result.shouldSkip).toBe(false)
  })

  it('should not skip when automation has never run', () => {
    const now = Date.now()
    const automation: Automation = {
      ...baseAutomation,
      frequency: 'daily',
      lastRun: undefined
    }
    const automationId = 'auto-123'

    const result = checkRunRecently(automation, automationId, now)

    expect(result.shouldSkip).toBe(false)
  })

  it('should not skip for one-time automations', () => {
    const now = Date.now()
    const automation: Automation = {
      ...baseAutomation,
      frequency: 'once',
      lastRun: now - 1000 // 1 second ago
    }
    const automationId = 'auto-123'

    const result = checkRunRecently(automation, automationId, now)

    expect(result.shouldSkip).toBe(false)
  })

  it('should account for 1-minute leeway', () => {
    const now = Date.now()
    const automation: Automation = {
      ...baseAutomation,
      frequency: 'every_5_minutes',
      lastRun: now - 1000 * 60 * 4.5 // 4.5 minutes ago (within leeway)
    }
    const automationId = 'auto-123'

    const result = checkRunRecently(automation, automationId, now)

    // With 1-minute leeway, should not skip
    expect(result.shouldSkip).toBe(false)
  })
})
