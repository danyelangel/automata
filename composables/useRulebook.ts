import { computed, type Ref, type ComputedRef } from 'vue'

/**
 * Rule interface for rulebook.
 */
export interface Rule {
  content: string
}

/**
 * Rulebook interface.
 */
export interface Rulebook {
  rules: Rule[]
}

/**
 * Data access adapter interface for rulebook.
 * Implement this in your application to provide database-specific access.
 */
export interface RulebookDataAdapter {
  /** Get the rulebook for a project */
  get: () => Ref<Rulebook | undefined> | ComputedRef<Rulebook | undefined>
  /** Update the rulebook */
  update: (rulebook: Rulebook) => Promise<void>
}

/**
 * Composable for managing rulebook.
 * Provides reactive data and methods for rulebook operations.
 */
export function useRulebook(adapter: RulebookDataAdapter) {
  const rulebook = adapter.get()

  const rules = computed(() => {
    return rulebook.value?.rules || []
  })

  const hasRules = computed(() => {
    return rules.value.length > 0
  })

  return {
    rulebook,
    rules,
    hasRules,
    update: adapter.update,
  }
}
