import { computed, type Ref, type ComputedRef } from 'vue'
import type { Automation } from '../types/automation'

/**
 * Data access adapter interface for automations.
 * Implement this in your application to provide database-specific access.
 */
export interface AutomationDataAdapter {
  /** Get all automations for a project */
  getAll: () => Ref<Automation[]> | ComputedRef<Automation[]>
  /** Get a single automation by ID */
  getById: (id: string) => Ref<Automation | undefined> | ComputedRef<Automation | undefined>
  /** Create a new automation */
  create: (data: Omit<Automation, 'id'>) => Promise<string>
  /** Update an automation */
  update: (id: string, data: Partial<Automation>) => Promise<void>
  /** Delete an automation */
  delete: (id: string) => Promise<void>
  /** Enable/disable an automation */
  setEnabled: (id: string, enabled: boolean) => Promise<void>
  /** Batch enable/disable multiple automations */
  batchSetEnabled: (ids: string[], enabled: boolean) => Promise<void>
  /** Batch delete multiple automations */
  batchDelete: (ids: string[]) => Promise<void>
}

/**
 * Composable for managing automations.
 * Provides reactive data and methods for CRUD operations.
 */
export function useAutomations(adapter: AutomationDataAdapter) {
  const automations = adapter.getAll()

  const sortedAutomations = computed(() => {
    return [...automations.value].sort((a, b) => {
      // Sort by enabled status first (enabled = true comes first)
      if (a.enabled && !b.enabled) return -1
      if (!a.enabled && b.enabled) return 1
      return 0
    })
  })

  const enabledCount = computed(() => {
    return automations.value.filter(a => a.enabled).length
  })

  const totalExecutions = computed(() => {
    return automations.value.reduce((sum, a) => sum + (a.executions || 0), 0)
  })

  return {
    automations,
    sortedAutomations,
    enabledCount,
    totalExecutions,
    create: adapter.create,
    update: adapter.update,
    delete: adapter.delete,
    setEnabled: adapter.setEnabled,
    batchSetEnabled: adapter.batchSetEnabled,
    batchDelete: adapter.batchDelete,
    getById: adapter.getById,
  }
}
