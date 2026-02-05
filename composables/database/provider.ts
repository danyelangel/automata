import type { Ref, ComputedRef } from 'vue'
import type { CloudAgent } from '../../types/agent'
import type { Automation } from '../../types/automation'

/** Reactive reference to a list or single entity (Ref or ComputedRef). */
type MaybeRef<T> = Ref<T> | ComputedRef<T>

/**
 * Database provider for cloud agents.
 * Implement this in your application to provide persistence (e.g. Firebase).
 * The provider is typically bound to the current project when created.
 */
export interface CloudAgentDatabaseProvider {
  /** Get all agents for the current project */
  getAgents(): MaybeRef<CloudAgent[]>
  /** Get a single agent by ID */
  getAgent(agentId: string): MaybeRef<CloudAgent | undefined>
  /** Create a new agent; returns the new agent ID */
  createAgent(data: Partial<CloudAgent>): Promise<string>
  /** Update an existing agent */
  updateAgent(agentId: string, data: Partial<CloudAgent>): Promise<void>
  /** Delete an agent */
  deleteAgent(agentId: string): Promise<void>
}

/**
 * Database provider for automations.
 * Implement this in your application to provide persistence (e.g. Firebase).
 */
export interface AutomationDatabaseProvider {
  /** Get all automations for the current project */
  getAutomations(): MaybeRef<Automation[]>
  /** Get a single automation by ID */
  getAutomation(id: string): MaybeRef<Automation | undefined>
  /** Create a new automation; returns the new automation ID */
  createAutomation(data: Omit<Automation, 'id'>): Promise<string>
  /** Update an existing automation */
  updateAutomation(id: string, data: Partial<Automation>): Promise<void>
  /** Delete an automation */
  deleteAutomation(id: string): Promise<void>
}
