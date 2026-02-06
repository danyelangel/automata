import { checkAlreadyRun } from './alreadyRun'
import type { Automation } from '../../types/automation'

describe('checkAlreadyRun', () => {
  const baseAutomation: Automation = {
    name: 'Test Automation',
    projectId: 'project-123',
    frequency: 'once',
    enabled: true,
    prompt: 'test prompt',
    startDate: Date.now(),
    maxExecutions: 1
  }

  it('should skip when one-time automation has already run', () => {
    const automation: Automation = {
      ...baseAutomation,
      frequency: 'once',
      lastRun: Date.now() - 1000
    }
    const automationId = 'auto-123'

    const result = checkAlreadyRun(automation, automationId)

    expect(result.shouldSkip).toBe(true)
    expect(result.reasonType).toBe('already_run')
    expect(result.reason).toContain('has already run')
  })

  it('should not skip when one-time automation has not run', () => {
    const automation: Automation = {
      ...baseAutomation,
      frequency: 'once',
      lastRun: undefined
    }
    const automationId = 'auto-123'

    const result = checkAlreadyRun(automation, automationId)

    expect(result.shouldSkip).toBe(false)
  })

  it('should not skip when automation frequency is not once', () => {
    const automation: Automation = {
      ...baseAutomation,
      frequency: 'daily',
      lastRun: Date.now() - 1000
    }
    const automationId = 'auto-123'

    const result = checkAlreadyRun(automation, automationId)

    expect(result.shouldSkip).toBe(false)
  })

  it('should not skip when recurring automation has run', () => {
    const automation: Automation = {
      ...baseAutomation,
      frequency: 'every_5_minutes',
      lastRun: Date.now() - 60000
    }
    const automationId = 'auto-123'

    const result = checkAlreadyRun(automation, automationId)

    expect(result.shouldSkip).toBe(false)
  })
})
