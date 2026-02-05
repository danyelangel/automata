import { checkMaxExecutions } from './maxExecutions'
import type { Automation } from '../../types/automation'

describe('checkMaxExecutions', () => {
  const baseAutomation: Automation = {
    name: 'Test Automation',
    projectId: 'project-123',
    frequency: 'daily',
    enabled: true,
    prompt: 'test prompt',
    startDate: Date.now(),
    maxExecutions: 10
  }

  it('should skip when executions equals maxExecutions', () => {
    const automation: Automation = {
      ...baseAutomation,
      executions: 10,
      maxExecutions: 10
    }
    const automationId = 'auto-123'

    const result = checkMaxExecutions(automation, automationId)

    expect(result.shouldSkip).toBe(true)
    expect(result.reasonType).toBe('max_executions')
    expect(result.reason).toContain('reached the maximum number of executions')
  })

  it('should skip when executions exceeds maxExecutions', () => {
    const automation: Automation = {
      ...baseAutomation,
      executions: 15,
      maxExecutions: 10
    }
    const automationId = 'auto-123'

    const result = checkMaxExecutions(automation, automationId)

    expect(result.shouldSkip).toBe(true)
    expect(result.reasonType).toBe('max_executions')
  })

  it('should not skip when executions is less than maxExecutions', () => {
    const automation: Automation = {
      ...baseAutomation,
      executions: 5,
      maxExecutions: 10
    }
    const automationId = 'auto-123'

    const result = checkMaxExecutions(automation, automationId)

    expect(result.shouldSkip).toBe(false)
  })

  it('should not skip when executions is undefined', () => {
    const automation: Automation = {
      ...baseAutomation,
      executions: undefined,
      maxExecutions: 10
    }
    const automationId = 'auto-123'

    const result = checkMaxExecutions(automation, automationId)

    expect(result.shouldSkip).toBe(false)
  })

  it('should not skip when maxExecutions is Infinity', () => {
    const automation: Automation = {
      ...baseAutomation,
      executions: 1000,
      maxExecutions: Infinity
    }
    const automationId = 'auto-123'

    const result = checkMaxExecutions(automation, automationId)

    expect(result.shouldSkip).toBe(false)
  })

  it('should not skip when maxExecutions is undefined (defaults to Infinity)', () => {
    const automation: Automation = {
      ...baseAutomation,
      executions: 1000,
      maxExecutions: undefined as unknown as number
    }
    const automationId = 'auto-123'

    const result = checkMaxExecutions(automation, automationId)

    expect(result.shouldSkip).toBe(false)
  })
})
