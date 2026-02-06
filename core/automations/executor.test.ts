import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAutomationExecutorHandler } from './executor'
import type { AutomationExecutorConfig } from './types'
import type { Automation } from '../types/automation'
import { ToolRegistry } from '../tools/registry'

describe('createAutomationExecutorHandler', () => {
  let mockDb: any
  let mockBatch: any
  let config: AutomationExecutorConfig
  let toolRegistry: ToolRegistry

  // Helper function to create mock collection
  function createMockCollection(automation: Automation, mockDocRef: any) {
    const mockSnapshot = {
      empty: false,
      docs: [
        {
          id: 'auto-123',
          data: () => automation,
          ref: mockDocRef
        }
      ]
    }

    return vi.fn((collectionName: string) => {
      if (collectionName === 'automations') {
        return {
          where: vi.fn(() => ({
            get: vi.fn().mockResolvedValue(mockSnapshot)
          }))
        }
      }
      return {
        doc: vi.fn(() => ({ id: 'agent-123' }))
      }
    })
  }

  beforeEach(() => {
    toolRegistry = new ToolRegistry()

    // Mock Firestore database
    mockBatch = {
      set: vi.fn(),
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined)
    }

    const mockCollection = vi.fn((collectionName: string) => ({
      where: vi.fn((field: string, op: string, value: any) => ({
        get: vi.fn().mockResolvedValue({
          empty: false,
          docs: []
        })
      })),
      doc: vi.fn(() => ({
        id: 'agent-123'
      }))
    }))

    mockDb = {
      collection: mockCollection,
      batch: vi.fn(() => mockBatch)
    }

    config = {
      schedule: '* * * * *',
      timeZone: 'UTC',
      toolRegistry,
      db: mockDb,
      automationsCollection: 'automations',
      agentsCollection: 'agents',
      buildContext: (automation: Automation) => []
    }
  })

  it('should return a handler function', () => {
    const handler = createAutomationExecutorHandler(config)
    expect(typeof handler).toBe('function')
  })

  it('should handle empty automations list', async () => {
    mockDb.collection = vi.fn(() => ({
      where: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({
          empty: true,
          docs: []
        })
      }))
    }))

    const handler = createAutomationExecutorHandler(config)
    await handler()

    expect(mockBatch.commit).not.toHaveBeenCalled()
  })

  it('should skip automations that are not ready', async () => {
    const automation: Automation = {
      name: 'Test Automation',
      projectId: 'project-123',
      frequency: 'daily',
      enabled: true,
      prompt: 'test prompt',
      startDate: Date.now() + 10000, // Future date
      maxExecutions: 10
    }

    const mockDocRef = {
      update: vi.fn()
    }

    const mockSnapshot = {
      empty: false,
      docs: [
        {
          id: 'auto-123',
          data: () => automation,
          ref: mockDocRef
        }
      ]
    }

    mockDb.collection = vi.fn((collectionName: string) => {
      if (collectionName === 'automations') {
        return {
          where: vi.fn(() => ({
            get: vi.fn().mockResolvedValue(mockSnapshot)
          }))
        }
      }
      return {
        doc: vi.fn(() => ({ id: 'agent-123' }))
      }
    })

    const handler = createAutomationExecutorHandler(config)
    await handler()

    expect(mockBatch.set).not.toHaveBeenCalled()
    expect(mockBatch.commit).not.toHaveBeenCalled()
  })

  it('should create agent for valid automation', async () => {
    const automation: Automation = {
      name: 'Test Automation',
      projectId: 'project-123',
      frequency: 'daily',
      enabled: true,
      prompt: 'test prompt',
      startDate: Date.now() - 10000, // Past date
      maxExecutions: 10
    }

    const mockDocRef = {
      update: vi.fn()
    }

    mockDb.collection = createMockCollection(automation, mockDocRef)

    const handler = createAutomationExecutorHandler(config)
    await handler()

    expect(mockBatch.set).toHaveBeenCalled()
    expect(mockBatch.update).toHaveBeenCalled()
    expect(mockBatch.commit).toHaveBeenCalled()
  })

  it('should use custom agent name prefix', async () => {
    const automation: Automation = {
      name: 'Test Automation',
      projectId: 'project-123',
      frequency: 'daily',
      enabled: true,
      prompt: 'test prompt',
      startDate: Date.now() - 10000,
      maxExecutions: 10
    }

    config.agentNamePrefix = '🚀 '

    const mockDocRef = {
      update: vi.fn()
    }

    mockDb.collection = createMockCollection(automation, mockDocRef)

    const handler = createAutomationExecutorHandler(config)
    await handler()

    const setCall = mockBatch.set.mock.calls[0]
    expect(setCall[1].name).toBe('🚀 Test Automation')
  })

  it('should use custom default model', async () => {
    const automation: Automation = {
      name: 'Test Automation',
      projectId: 'project-123',
      frequency: 'daily',
      enabled: true,
      prompt: 'test prompt',
      startDate: Date.now() - 10000,
      maxExecutions: 10
      // No model specified
    }

    config.defaultModel = 'gpt-4'

    const mockDocRef = {
      update: vi.fn()
    }

    mockDb.collection = createMockCollection(automation, mockDocRef)

    const handler = createAutomationExecutorHandler(config)
    await handler()

    const setCall = mockBatch.set.mock.calls[0]
    expect(setCall[1].model).toBe('gpt-4')
  })

  it('should call track function when provided', async () => {
    const automation: Automation = {
      name: 'Test Automation',
      projectId: 'project-123',
      frequency: 'daily',
      enabled: true,
      prompt: 'test prompt',
      startDate: Date.now() - 10000,
      maxExecutions: 10
    }

    const mockTrack = vi.fn()
    config.track = mockTrack

    const mockDocRef = {
      update: vi.fn()
    }

    mockDb.collection = createMockCollection(automation, mockDocRef)

    const handler = createAutomationExecutorHandler(config)
    await handler()

    expect(mockTrack).toHaveBeenCalledWith('automation_executed', expect.objectContaining({
      automation_id: 'auto-123',
      automation_name: 'Test Automation',
      project_id: 'project-123',
      frequency: 'daily'
    }))
  })

  it('should disable automation after max executions for one-time automations', async () => {
    const automation: Automation = {
      name: 'Test Automation',
      projectId: 'project-123',
      frequency: 'once',
      enabled: true,
      prompt: 'test prompt',
      startDate: Date.now() - 10000,
      maxExecutions: 1,
      executions: 0
    }

    const mockDocRef = {
      update: vi.fn()
    }

    mockDb.collection = createMockCollection(automation, mockDocRef)

    const handler = createAutomationExecutorHandler(config)
    await handler()

    const updateCall = mockBatch.update.mock.calls[0]
    expect(updateCall[1].enabled).toBe(false)
    expect(updateCall[1].executions).toBe(1)
  })

  it('should keep automation enabled for recurring automations under max executions', async () => {
    const automation: Automation = {
      name: 'Test Automation',
      projectId: 'project-123',
      frequency: 'daily',
      enabled: true,
      prompt: 'test prompt',
      startDate: Date.now() - 10000,
      maxExecutions: 10,
      executions: 5
    }

    const mockDocRef = {
      update: vi.fn()
    }

    mockDb.collection = createMockCollection(automation, mockDocRef)

    const handler = createAutomationExecutorHandler(config)
    await handler()

    const updateCall = mockBatch.update.mock.calls[0]
    expect(updateCall[1].enabled).toBe(true)
    expect(updateCall[1].executions).toBe(6)
  })

  it('should handle errors and call track if provided', async () => {
    mockDb.collection = vi.fn(() => {
      throw new Error('Database error')
    })

    const mockTrack = vi.fn()
    config.track = mockTrack

    const handler = createAutomationExecutorHandler(config)

    await expect(handler()).rejects.toThrow('Database error')
    expect(mockTrack).toHaveBeenCalledWith('automation_cron_error', expect.objectContaining({
      error: 'Database error'
    }))
  })

  it('should use buildContext to create context items', async () => {
    const automation: Automation = {
      name: 'Test Automation',
      projectId: 'project-123',
      frequency: 'daily',
      enabled: true,
      prompt: 'test prompt',
      startDate: Date.now() - 10000,
      maxExecutions: 10
    }

    const mockContext = [
      { id: 'ctx-1', type: 'brief', name: 'Brief 1' }
    ]

    config.buildContext = vi.fn(() => mockContext)

    const mockDocRef = {
      update: vi.fn()
    }

    mockDb.collection = createMockCollection(automation, mockDocRef)

    const handler = createAutomationExecutorHandler(config)
    await handler()

    expect(config.buildContext).toHaveBeenCalledWith(automation)
    const setCall = mockBatch.set.mock.calls[0]
    expect(setCall[1].context).toEqual(mockContext)
  })
})
