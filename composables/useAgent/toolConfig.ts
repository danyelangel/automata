import type { ToolRegistry } from '../../tools'

/**
 * UI configuration for a tool in the tool selector.
 * Built from ToolRegistry when tools include optional ui metadata.
 */
export interface ToolConfig {
  /** Tool identifier (matches tool name in registry) */
  type: string
  /** Display label */
  label: string
  /** Icon name (e.g. Material icon) */
  icon: string
  /** Category for grouping in selector */
  category: string
  /** If true, tool is shown but not selectable */
  premium?: boolean
  /** Feature flag key; app can filter by this */
  flag?: string
}

/**
 * Build tool configs from a ToolRegistry.
 * Tools may optionally define ui metadata (category, icon, label, premium, flag).
 */
export function getToolConfigs(registry: ToolRegistry): ToolConfig[] {
  return registry.getAvailable().map((tool) => ({
    type: tool.name,
    label: tool.ui?.label ?? tool.name,
    icon: tool.ui?.icon ?? 'build',
    category: tool.ui?.category ?? 'other',
    premium: tool.ui?.premium,
    flag: tool.ui?.flag,
  }))
}

/**
 * Group tool configs by category.
 */
export function getToolsByCategory(registry: ToolRegistry): Record<string, ToolConfig[]> {
  const configs = getToolConfigs(registry)
  return configs.reduce(
    (acc, tool) => {
      if (!acc[tool.category]) acc[tool.category] = []
      acc[tool.category].push(tool)
      return acc
    },
    {} as Record<string, ToolConfig[]>
  )
}

/**
 * Get a single tool config by type (tool name).
 */
export function getToolConfig(registry: ToolRegistry, type: string): ToolConfig | undefined {
  return getToolConfigs(registry).find((c) => c.type === type)
}
