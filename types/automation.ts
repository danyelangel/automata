/**
 * Configuration for an automated agent execution.
 * Defines when and how an agent should run automatically.
 */
export interface Automation {
  /** Human-readable automation name */
  name: string
  /** Project this automation belongs to */
  projectId: string
  /** AI model to use (optional, may use default) */
  model?: string
  /** Cron-style frequency expression */
  frequency: string
  /** Whether the automation is currently active */
  enabled: boolean
  /** Instructions/prompt for the agent */
  prompt: string
  /** Timestamp of last execution */
  lastRun?: number
  /** Total number of times this automation has run */
  executions?: number
  /** Last update timestamp */
  updatedAt?: number
  /** When the automation should start being eligible to run */
  startDate: number
  /** Maximum number of times this automation can execute */
  maxExecutions: number
}

/**
 * Result of checking whether an automation should be skipped.
 */
export interface SkipResult {
  /** Whether the automation should be skipped */
  shouldSkip: boolean
  /** Human-readable reason for skipping */
  reason?: string
  /** Machine-readable reason type */
  reasonType?: 'not_ready' | 'run_recently' | 'max_executions' | 'already_run' | 'rate_limited'
}
