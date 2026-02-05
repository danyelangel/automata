import { computed, type Ref, type ComputedRef } from 'vue'

/**
 * Connector configuration interface.
 */
export interface Connector {
  id: string
  name: string
  description: string
  icon: string
  enabled: boolean
  pricing?: string
}

/**
 * Data access adapter interface for connectors.
 * Implement this in your application to provide connector configuration access.
 */
export interface ConnectorDataAdapter {
  /** Get all available connectors */
  getAll: () => Ref<Connector[]> | ComputedRef<Connector[]>
  /** Toggle a connector's enabled state */
  toggle: (connectorId: string) => Promise<void>
}

/**
 * Composable for managing connectors.
 * Provides reactive data and methods for connector operations.
 */
export function useConnectors(adapter: ConnectorDataAdapter) {
  const connectors = adapter.getAll()

  const activeConnectors = computed(() => {
    return connectors.value.filter(c => c.enabled)
  })

  const availableConnectors = computed(() => {
    return connectors.value.filter(c => !c.enabled)
  })

  return {
    connectors,
    activeConnectors,
    availableConnectors,
    toggle: adapter.toggle,
  }
}
