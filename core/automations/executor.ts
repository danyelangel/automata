import type { AutomationExecutorConfig } from './types'
import type { Automation, SkipResult } from '../types/automation'
import {
  checkNotReady,
  checkRunRecently,
  checkMaxExecutions,
  checkAlreadyRun,
  checkRateLimited,
  getModelType,
  getMaxAgentsForModel
} from './skipCheckers'

/**
 * Check if an automation should be skipped and return detailed result
 * Orchestrates all skip checkers in priority order
 */
function checkShouldSkipAutomation (
  automation: Automation,
  automationId: string,
  now: number,
  agentsCreatedByModelType: Record<string, number>
): SkipResult {
  // Run checks in priority order
  // Exit early on first skip condition found
  let result: SkipResult

  result = checkNotReady(automation, automationId, now)
  if (result.shouldSkip) return result

  result = checkRunRecently(automation, automationId, now)
  if (result.shouldSkip) return result

  result = checkMaxExecutions(automation, automationId)
  if (result.shouldSkip) return result

  result = checkAlreadyRun(automation, automationId)
  if (result.shouldSkip) return result

  result = checkRateLimited(automation, automationId, agentsCreatedByModelType)
  if (result.shouldSkip) return result

  // No reason to skip
  return { shouldSkip: false }
}

/**
 * Handle automation skip - logs and optionally tracks
 */
function handleAutomationSkip (
  skipResult: SkipResult,
  automation: Automation,
  automationId: string,
  agentsCreatedByModelType: Record<string, number>,
  track?: (event: string, data?: Record<string, unknown>) => void | Promise<void>
): void {
  if (!skipResult.shouldSkip || !skipResult.reason) return

  // Always log the skip reason
  console.log(skipResult.reason)

  // Track if tracking function is provided
  if (track) {
    const baseTrackingData = {
      automation_id: automationId,
      automation_name: automation.name,
      project_id: automation.projectId,
      frequency: automation.frequency,
      skip_reason: skipResult.reasonType
    }

    switch (skipResult.reasonType) {
      case 'rate_limited': {
        const model = automation.model || 'gpt-5.2'
        const modelType = getModelType(model)
        const maxAgents = getMaxAgentsForModel(model)
        const agentCount = agentsCreatedByModelType[modelType] || 0

        track('automation_skipped', {
          ...baseTrackingData,
          model,
          model_type: modelType,
          agents_created_this_minute: agentCount,
          max_agents_for_model: maxAgents
        })
        break
      }

      case 'not_ready':
      case 'run_recently':
      case 'max_executions':
      case 'already_run':
        track('automation_skipped', baseTrackingData)
        break
    }
  }
}

/**
 * Framework-agnostic automation executor handler
 * This can be wrapped by Firebase Functions or other scheduling frameworks
 */
export function createAutomationExecutorHandler (
  config: AutomationExecutorConfig
): () => Promise<void> {
  const {
    db,
    automationsCollection,
    agentsCollection,
    buildContext,
    toolRegistry,
    agentNamePrefix = '⚡️ ',
    defaultModel = 'gpt-5.2',
    track
  } = config

  return async () => {
    try {
      console.log('Starting automation execution')

      const now = Date.now()

      // Get all enabled automations across all projects
      const automationsSnapshot = await db
        .collection(automationsCollection)
        .where('enabled', '==', true)
        .get()

      if (automationsSnapshot.empty) {
        console.log('No enabled automations found')
        return
      }

      console.log(`Found ${automationsSnapshot.docs.length} enabled automations`)

      const batch = db.batch()
      let agentsCreated = 0
      // Track agents created GLOBALLY per model type in this minute
      // OpenAI rate limits are global, not per-project
      // Key format: modelType ("small" or "large")
      const agentsCreatedByModelType: Record<string, number> = {}

      // Get available tools from registry
      const availableTools = toolRegistry.getAvailable().map(tool => ({
        type: 'function' as const,
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }))

      for (const doc of automationsSnapshot.docs) {
        const automation = doc.data() as Automation
        const automationId = doc.id

        // Check if automation should be skipped
        const skipResult = checkShouldSkipAutomation(automation, automationId, now, agentsCreatedByModelType)
        if (skipResult.shouldSkip) {
          handleAutomationSkip(skipResult, automation, automationId, agentsCreatedByModelType, track)
          continue
        }

        // Get model type for tracking
        const model = automation.model || defaultModel
        const modelType = getModelType(model)

        console.log(`Creating agent for automation: ${automation.name} (${automationId})`)

        // Build context from automation references
        const context = buildContext(automation)

        // Create agent document
        const agentRef = db.collection(agentsCollection).doc()
        const agentData = {
          projectId: automation.projectId,
          model,
          tools: availableTools,
          context: context,
          history: [
            {
              type: 'message',
              role: 'user',
              content: `<prompt>${automation.prompt}</prompt><automation_id>${automationId}</automation_id>`
            }
          ],
          status: 'running',
          name: `${agentNamePrefix}${automation.name}`,
          createdAt: now,
          updatedAt: now,
          automationId: automationId, // Track which automation created this agent
          type: 'automation'
        }

        batch.set(agentRef, agentData)

        // Update automation's lastRun timestamp
        const shouldKeepAutomationEnabled = automation.frequency !== 'once' && (automation.executions || 0) < (automation.maxExecutions || Infinity)

        batch.update(doc.ref, {
          executions: (automation.executions || 0) + 1,
          enabled: shouldKeepAutomationEnabled,
          lastRun: now,
          updatedAt: now
        })

        agentsCreated++
        // Increment the global counter for this model type
        agentsCreatedByModelType[modelType] = (agentsCreatedByModelType[modelType] || 0) + 1

        // Track individual automation execution if tracking is provided
        if (track) {
          track('automation_executed', {
            automation_id: automationId,
            automation_name: automation.name,
            project_id: automation.projectId,
            frequency: automation.frequency
          })
        }
      }

      // Commit all changes
      const hasAgentsToCommit = agentsCreated > 0

      if (hasAgentsToCommit) {
        await batch.commit()
        console.log(`Successfully created ${agentsCreated} agents for automations`)
      } else {
        console.log('No automations needed to run at this time')
      }
    } catch (error) {
      console.error('Error running automations:', error)
      if (track) {
        track('automation_cron_error', {
          error: error instanceof Error ? error.message : String(error)
        })
      }
      throw error
    }
  }
}

/**
 * Creates a Firebase Cloud Function for automation execution
 * This is a convenience wrapper for Firebase Functions v2
 * Requires firebase-functions to be installed
 */
export function createAutomationExecutor (config: AutomationExecutorConfig) {
  const handler = createAutomationExecutorHandler(config)

  // Return configuration that can be used with Firebase Functions
  // Users should import onSchedule from 'firebase-functions/v2/scheduler'
  // Example:
  // const executor = createAutomationExecutor(config)
  // export const runAutomations = onSchedule(executor.schedule, executor.handler)
  return {
    schedule: {
      schedule: config.schedule,
      timeZone: config.timeZone,
      retryCount: 0
    },
    handler
  }
}
