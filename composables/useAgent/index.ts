import { ref } from 'vue'
import type { ContextItem } from '../../types/context'

export * from './types'
export * from './toolConfig'

/**
 * Context type is extensible (string). Apps can use unions like 'site' | 'article' | 'brief'.
 */
export type ContextType = string

/**
 * UI-facing tool selection item (id for list key, type = tool name, name = label).
 */
export interface ToolSelectionItem {
  id: string
  type: string
  name: string
}

import type { ContextItem } from '../../types/context'
import type { ToolItem } from '../../types/tool'

const selectedContext = ref<ContextItem[]>([])
const selectedTools = ref<ToolItem[]>([])

/**
 * Composable for current agent session state: selected tools and context.
 * Used by useCloudAgents when sending messages and by the composer UI.
 */
export function useAgent() {
  const addToContext = (item: ContextItem) => {
    if (!selectedContext.value.find((i) => i.id === item.id)) {
      selectedContext.value.push(item)
    }
  }

  const removeFromContext = (itemId: string) => {
    selectedContext.value = selectedContext.value.filter((item) => item.id !== itemId)
  }

  const setContext = (items: ContextItem[]) => {
    selectedContext.value = items
  }

  const addToTools = (item: ToolItem) => {
    if (!selectedTools.value.find((i) => i.type === item.type)) {
      selectedTools.value.push(item)
    }
  }

  const removeFromTools = (toolType: string) => {
    selectedTools.value = selectedTools.value.filter((item) => item.type !== toolType)
  }

  const setTools = (items: ToolItem[]) => {
    selectedTools.value = items
  }

  return {
    selectedContext,
    addToContext,
    removeFromContext,
    setContext,
    selectedTools,
    addToTools,
    removeFromTools,
    setTools,
  }
}
