import { checkRateLimited, getMaxAgentsForModel, getModelType } from './rateLimited'
import type { Automation } from '../../types/automation'

describe('getMaxAgentsForModel', () => {
  it('should return 2 for small models', () => {
    expect(getMaxAgentsForModel('gpt-5-mini')).toBe(2)
  })

  it('should return 5 for large models', () => {
    expect(getMaxAgentsForModel('gpt-5.2')).toBe(5)
    expect(getMaxAgentsForModel('gpt-5.1')).toBe(5)
    expect(getMaxAgentsForModel('gpt-5')).toBe(5)
  })

  it('should return 5 for unknown models', () => {
    expect(getMaxAgentsForModel('unknown-model')).toBe(5)
  })

  it('should return 5 when no model specified', () => {
    expect(getMaxAgentsForModel()).toBe(5)
  })
})

describe('getModelType', () => {
  it('should return "small" for small models', () => {
    expect(getModelType('gpt-5-mini')).toBe('small')
  })

  it('should return "large" for large models', () => {
    expect(getModelType('gpt-5.2')).toBe('large')
    expect(getModelType('gpt-5.1')).toBe('large')
    expect(getModelType('gpt-5')).toBe('large')
  })

  it('should return "large" for unknown models', () => {
    expect(getModelType('unknown-model')).toBe('large')
  })

  it('should return "large" when no model specified', () => {
    expect(getModelType()).toBe('large')
  })
})

describe('checkRateLimited', () => {
  const baseAutomation: Automation = {
    name: 'Test Automation',
    projectId: 'project-123',
    frequency: 'daily',
    enabled: true,
    prompt: 'test prompt',
    startDate: Date.now(),
    maxExecutions: 10
  }

  it('should skip when small model rate limit is reached', () => {
    const automation: Automation = {
      ...baseAutomation,
      model: 'gpt-5-mini'
    }
    const automationId = 'auto-123'
    const agentsCreatedByModelType = { small: 2, large: 0 }

    const result = checkRateLimited(automation, automationId, agentsCreatedByModelType)

    expect(result.shouldSkip).toBe(true)
    expect(result.reasonType).toBe('rate_limited')
    expect(result.reason).toContain('rate limited')
    expect(result.reason).toContain('2/2')
    expect(result.reason).toContain('small')
  })

  it('should skip when large model rate limit is reached', () => {
    const automation: Automation = {
      ...baseAutomation,
      model: 'gpt-5'
    }
    const automationId = 'auto-123'
    const agentsCreatedByModelType = { small: 0, large: 5 }

    const result = checkRateLimited(automation, automationId, agentsCreatedByModelType)

    expect(result.shouldSkip).toBe(true)
    expect(result.reasonType).toBe('rate_limited')
    expect(result.reason).toContain('5/5')
    expect(result.reason).toContain('large')
  })

  it('should not skip when small model is below limit', () => {
    const automation: Automation = {
      ...baseAutomation,
      model: 'gpt-5-mini'
    }
    const automationId = 'auto-123'
    const agentsCreatedByModelType = { small: 1, large: 0 }

    const result = checkRateLimited(automation, automationId, agentsCreatedByModelType)

    expect(result.shouldSkip).toBe(false)
  })

  it('should not skip when large model is below limit', () => {
    const automation: Automation = {
      ...baseAutomation,
      model: 'gpt-5'
    }
    const automationId = 'auto-123'
    const agentsCreatedByModelType = { small: 0, large: 3 }

    const result = checkRateLimited(automation, automationId, agentsCreatedByModelType)

    expect(result.shouldSkip).toBe(false)
  })

  it('should not skip when no agents have been created', () => {
    const automation: Automation = {
      ...baseAutomation,
      model: 'gpt-5'
    }
    const automationId = 'auto-123'
    const agentsCreatedByModelType = {}

    const result = checkRateLimited(automation, automationId, agentsCreatedByModelType)

    expect(result.shouldSkip).toBe(false)
  })

  it('should use default model when model is undefined', () => {
    const automation: Automation = {
      ...baseAutomation,
      model: undefined
    }
    const automationId = 'auto-123'
    const agentsCreatedByModelType = { large: 5 }

    const result = checkRateLimited(automation, automationId, agentsCreatedByModelType)

    // Default model is gpt-5.2 (large), so should be rate limited at 5
    expect(result.shouldSkip).toBe(true)
    expect(result.reasonType).toBe('rate_limited')
  })

  it('should check correct model type (small vs large)', () => {
    const automation: Automation = {
      ...baseAutomation,
      model: 'gpt-5-mini' // small model
    }
    const automationId = 'auto-123'
    // Large models are at limit, but small models are not
    const agentsCreatedByModelType = { small: 0, large: 5 }

    const result = checkRateLimited(automation, automationId, agentsCreatedByModelType)

    // Should not be rate limited because we're checking small model
    expect(result.shouldSkip).toBe(false)
  })
})
