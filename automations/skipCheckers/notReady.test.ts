import { checkNotReady } from './notReady'
import type { Automation } from '../../types/automation'

describe('checkNotReady', () => {
  const baseAutomation: Automation = {
    name: 'Test Automation',
    projectId: 'project-123',
    frequency: 'daily',
    enabled: true,
    prompt: 'test prompt',
    startDate: Date.now() + 1000 * 60 * 60, // 1 hour in the future
    maxExecutions: 10
  }

  it('should skip when automation startDate is in the future', () => {
    const now = Date.now()
    const automation = { ...baseAutomation, startDate: now + 1000 }
    const automationId = 'auto-123'

    const result = checkNotReady(automation, automationId, now)

    expect(result.shouldSkip).toBe(true)
    expect(result.reasonType).toBe('not_ready')
    expect(result.reason).toContain('is not ready to run')
  })

  it('should not skip when automation startDate is in the past', () => {
    const now = Date.now()
    const automation = { ...baseAutomation, startDate: now - 1000 }
    const automationId = 'auto-123'

    const result = checkNotReady(automation, automationId, now)

    expect(result.shouldSkip).toBe(false)
    expect(result.reasonType).toBeUndefined()
    expect(result.reason).toBeUndefined()
  })

  it('should not skip when automation startDate is exactly now', () => {
    const now = Date.now()
    const automation = { ...baseAutomation, startDate: now }
    const automationId = 'auto-123'

    const result = checkNotReady(automation, automationId, now)

    expect(result.shouldSkip).toBe(false)
  })
})
