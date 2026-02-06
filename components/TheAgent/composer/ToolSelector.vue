<script setup lang="ts">
import { vOnClickOutside } from '@vueuse/components'
import { onKeyStroke } from '@vueuse/core'
import { ref, computed } from 'vue'
import type { ToolItem } from '../../../core/types/tool'

interface ToolConfig {
  type: string
  label: string
  icon: string
  category: string
  premium?: boolean
  flag?: string
}

const props = defineProps<{
  disabled?: boolean
  tools: ToolConfig[]
  selectedTools: ToolItem[]
  categoryOrder?: string[]
  categoryDisplayNames?: Record<string, string>
  categoryIcons?: Record<string, string>
  onToolToggle?: (tool: ToolConfig) => void
  onGroupToggle?: (category: string, enabled: boolean) => void
  onEnableAll?: () => void
  onDisableAll?: () => void
}>()

const showDropdown = ref(false)
const selectedType = ref<string | null>(null)
const searchQuery = ref('')
const expandedGroups = ref<Record<string, boolean>>({})

const emit = defineEmits<{
  (e: 'tool-toggle', tool: ToolConfig): void
  (e: 'group-toggle', category: string, enabled: boolean): void
  (e: 'enable-all'): void
  (e: 'disable-all'): void
}>()

const defaultCategoryOrder = [
  'content',
  'sites',
  'generation',
  'image',
  'automation',
  'web',
  'browser',
  'sports'
]

const defaultCategoryDisplayNames: Record<string, string> = {
  'content': 'Content',
  'sites': 'Sites',
  'generation': 'Generation',
  'image': 'Image',
  'automation': 'Automation',
  'web': 'Semantic Search',
  'browser': 'Browser',
  'sports': 'Real Time Sports'
}

const defaultCategoryIcons: Record<string, string> = {
  'content': 'description',
  'sites': 'language',
  'generation': 'auto_fix_high',
  'image': 'image',
  'automation': 'bolt',
  'web': 'search',
  'browser': 'web',
  'sports': 'sports_soccer'
}

const categoryOrder = computed(() => props.categoryOrder || defaultCategoryOrder)
const categoryDisplayNames = computed(() => props.categoryDisplayNames || defaultCategoryDisplayNames)
const categoryIcons = computed(() => props.categoryIcons || defaultCategoryIcons)

// Group tools by category
const toolsByCategory = computed(() => {
  const grouped: Record<string, ToolConfig[]> = {}
  props.tools.forEach(tool => {
    if (!grouped[tool.category]) {
      grouped[tool.category] = []
    }
    grouped[tool.category].push(tool)
  })
  return grouped
})

// Get categories in the desired order
const orderedCategories = computed(() => {
  return categoryOrder.value.filter(category =>
    toolsByCategory.value[category] && toolsByCategory.value[category].length > 0
  )
})

const resetDropdown = () => {
  showDropdown.value = false
  selectedType.value = null
  searchQuery.value = ''
}

const isToolSelected = (type: string) => {
  return props.selectedTools.some(tool => tool.type === type)
}

const toggleTool = (tool: ToolConfig) => {
  if (tool.premium) {
    return // Prevent activating premium features
  }

  if (props.onToolToggle) {
    props.onToolToggle(tool)
  } else {
    emit('tool-toggle', tool)
  }
}

const toggleGroup = (category: string, enabled: boolean) => {
  if (props.onGroupToggle) {
    props.onGroupToggle(category, enabled)
  } else {
    emit('group-toggle', category, enabled)
  }
}

const isGroupEnabled = (category: string) => {
  const tools = toolsByCategory.value[category] || []
  const nonPremiumTools = tools.filter(t => !t.premium)
  if (nonPremiumTools.length === 0) return false

  return nonPremiumTools.every(tool => isToolSelected(tool.type))
}

const toggleGroupExpansion = (category: string) => {
  const isCurrentlyExpanded = expandedGroups.value[category]

  // Collapse all groups
  Object.keys(expandedGroups.value).forEach(key => {
    expandedGroups.value[key] = false
  })

  // If the clicked group was not expanded, expand it now
  if (!isCurrentlyExpanded) {
    expandedGroups.value[category] = true
  }
}

const enableAllTools = () => {
  if (props.onEnableAll) {
    props.onEnableAll()
  } else {
    emit('enable-all')
  }
}

const disableAllTools = () => {
  if (props.onDisableAll) {
    props.onDisableAll()
  } else {
    emit('disable-all')
  }
}

onKeyStroke('Escape', () => {
  if (showDropdown.value) {
    resetDropdown()
  }
})
</script>

<template>
  <div class="relative">
    <!-- Tool Selector Button -->
    <button
      @click="showDropdown = !showDropdown"
      :disabled="props.disabled"
      :class="[
        'flex items-center gap-1 px-1 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-md text-sm transition-colors',
        props.disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
      ]"
    >
      <span class="material-symbols-outlined text-gray-800 dark:text-gray-200 !text-xs select-none">build</span>
      <div class="pr-1 text-gray-500 dark:text-gray-400">{{ selectedTools.length }} tool{{ selectedTools.length !== 1 ? 's' : '' }}</div>
    </button>

    <!-- Dropdown -->
    <div
      v-if="showDropdown"
      v-on-click-outside="resetDropdown"
      class="absolute left-0 bottom-full mb-1 w-64 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 py-1 z-10 max-h-[calc(100vh-12rem)] flex flex-col"
    >
      <!-- Enable/Disable All Buttons -->
      <div class="px-2 py-1 flex gap-2 flex-row justify-end">
        <button
          @click="enableAllTools"
          :disabled="props.disabled"
          :class="[
            'text-xs text-gray-500 dark:text-gray-400',
            props.disabled
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer'
          ]"
        >
          Enable All
        </button>
        <button
          @click="disableAllTools"
          :disabled="props.disabled"
          :class="[
            'text-xs text-gray-500 dark:text-gray-400',
            props.disabled
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer'
          ]"
        >
          Disable All
        </button>
      </div>

      <!-- Main Menu -->
      <div class="py-1 overflow-y-auto">
        <div
          v-for="category in orderedCategories"
          :key="category"
          class="border-b border-gray-200 dark:border-gray-700 last:border-0"
        >
          <!-- Group Header -->
          <div class="flex items-center justify-between pr-2 gap-2">
            <button
              @click="toggleGroupExpansion(category)"
              :disabled="props.disabled"
              class="flex items-center p-1.5 gap-2 flex-grow cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              :class="{ 'cursor-not-allowed opacity-50': props.disabled }"
            >
              <span class="material-symbols-outlined text-gray-500 dark:text-gray-400 !text-xs select-none transition-transform"
                    :class="{ 'rotate-90': expandedGroups[category] }">
                chevron_right
              </span>
              <span class="material-symbols-outlined text-gray-600 dark:text-gray-400 !text-xs select-none">{{ categoryIcons[category] }}</span>
              <span class="text-xs font-medium text-gray-800 dark:text-gray-200">{{ categoryDisplayNames[category] || category }}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400">({{ toolsByCategory[category].length }})</span>
            </button>

            <!-- Group Toggle -->
            <button
              @click.stop="toggleGroup(category, !isGroupEnabled(category))"
              :disabled="props.disabled"
              class="px-2 py-0.5 text-xs rounded transition-colors"
              :class="[
                isGroupEnabled(category)
                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
                props.disabled
                  ? 'cursor-not-allowed opacity-50'
                  : 'hover:opacity-80 cursor-pointer'
              ]"
            >
              {{ isGroupEnabled(category) ? 'All' : 'None' }}
            </button>
          </div>

          <!-- Group Tools (Collapsible) -->
          <div v-show="expandedGroups[category]" class="pb-1">
            <div
              v-for="tool in toolsByCategory[category]"
              :key="tool.type"
              :class="[
                'flex items-center gap-2 px-2 py-1 text-sm ml-4',
                tool.premium || props.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'
              ]"
              @click="(tool.premium || props.disabled) ? null : toggleTool(tool)"
            >
              <span class="material-symbols-outlined text-gray-500 dark:text-gray-400 !text-xs select-none">{{ tool.icon }}</span>
              <span class="text-xs flex-grow text-gray-800 dark:text-gray-200">{{ tool.label }}</span>
              <div class="flex items-center gap-1">
                <span
                  v-if="tool.premium"
                  class="material-symbols-outlined text-amber-500 !text-xs select-none"
                  title="Premium feature - Not available"
                >workspace_premium</span>
                <span v-if="isToolSelected(tool.type)" class="material-symbols-outlined text-green-600 dark:text-green-500 !text-xs select-none">check</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
