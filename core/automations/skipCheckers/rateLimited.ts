import type { Automation, SkipResult } from '../../types/automation'

// Global rate limits per model type (applied across all projects)
// OpenAI rate limits are global to the organization, not per-project
// Small/mini models have stricter rate limits (2 per minute globally)
// Large models have more generous rate limits (5 per minute globally)
const MAX_AGENTS_SMALL_MODEL = 2
const MAX_AGENTS_LARGE_MODEL = 5

// Model classification
const SMALL_MODELS = new Set(['gpt-5-mini'])

/**
 * Get the maximum agents per minute for a specific model
 *
 * @param model - The model being used for agent creation
 * @returns Maximum number of agents allowed per minute for this model type
 */
export function getMaxAgentsForModel (model?: string): number {
  if (model && SMALL_MODELS.has(model)) {
    return MAX_AGENTS_SMALL_MODEL
  }
  // Default for large models or unknown models
  return MAX_AGENTS_LARGE_MODEL
}

/**
 * Get the model type for rate limiting purposes
 * Groups models into 'small' or 'large' categories
 *
 * @param model - The model being used
 * @returns 'small' or 'large'
 */
export function getModelType (model?: string): 'small' | 'large' {
  if (model && SMALL_MODELS.has(model)) {
    return 'small'
  }
  return 'large'
}

/**
 * Check if automation is rate limited (global limit for model type reached)
 */
export function checkRateLimited (
  automation: Automation,
  automationId: string,
  agentsCreatedByModelType: Record<string, number>
): SkipResult {
  const model = automation.model || 'gpt-5.2'
  const modelType = getModelType(model)
  const maxAgents = getMaxAgentsForModel(model)
  const agentCount = agentsCreatedByModelType[modelType] || 0

  if (agentCount >= maxAgents) {
    return {
      shouldSkip: true,
      reason: `Automation ${automation.name} (${automationId}) rate limited - ${agentCount}/${maxAgents} ${modelType} model agents created this minute (global limit)`,
      reasonType: 'rate_limited'
    }
  }

  return { shouldSkip: false }
}
