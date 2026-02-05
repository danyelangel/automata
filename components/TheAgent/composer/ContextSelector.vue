<script setup lang="ts">
import { vOnClickOutside } from '@vueuse/components'
import { useInfiniteScroll, onKeyStroke } from '@vueuse/core'
import { ref, computed } from 'vue'
import type { ContextItem } from '../../../types/context'

interface ContextTypeConfig {
  type: string
  label: string
  icon: string
}

const props = defineProps<{
  disabled?: boolean
  selectedContext: ContextItem[]
  availableContexts: ContextItem[]
  contextTypes: ContextTypeConfig[]
  onContextSelect?: (item: ContextItem) => void
  onContextRemove?: (itemId: string) => void
}>()

const emit = defineEmits<{
  (e: 'context-select', item: ContextItem): void
  (e: 'context-remove', itemId: string): void
}>()

const showDropdown = ref(false)
const selectedType = ref<string | null>(null)
const searchQuery = ref('')
const itemsPerPage = 10
const currentPage = ref(1)

const getContextIcon = (type: string) => {
  return props.contextTypes.find(t => t.type === type)?.icon || 'help'
}

const paginatedFilteredContexts = computed(() => {
  if (!selectedType.value) return []

  const filtered = props.availableContexts
    .filter(item => item.type === selectedType.value)
    .filter(item =>
      searchQuery.value === '' ||
      item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
    .filter(item => !props.selectedContext.some(selected => selected.id === item.id))

  return filtered.slice(0, currentPage.value * itemsPerPage)
})

const hasMoreItems = computed(() => {
  if (!selectedType.value) return false

  const totalFilteredItems = props.availableContexts
    .filter(item => item.type === selectedType.value)
    .filter(item =>
      searchQuery.value === '' ||
      item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    ).length

  return totalFilteredItems > currentPage.value * itemsPerPage
})

const entityListRef = ref<HTMLElement | null>(null)

const { isLoading } = useInfiniteScroll(
  entityListRef,
  () => {
    if (hasMoreItems.value) {
      currentPage.value++
    }
  },
  { distance: 10 }
)

const resetPagination = () => {
  currentPage.value = 1
}

const selectType = (type: string) => {
  selectedType.value = type
  searchQuery.value = ''
  resetPagination()
}

const resetDropdown = () => {
  showDropdown.value = false
  selectedType.value = null
  searchQuery.value = ''
  resetPagination()
}

const handleContextSelect = (item: ContextItem) => {
  if (props.onContextSelect) {
    props.onContextSelect(item)
  } else {
    emit('context-select', item)
  }
}

const handleContextRemove = (itemId: string) => {
  if (props.onContextRemove) {
    props.onContextRemove(itemId)
  } else {
    emit('context-remove', itemId)
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
    <!-- Context Pills -->
    <div class="flex gap-2 p-1 flex-wrap">
      <!-- Add Context Button -->
      <button
        @click="showDropdown = !showDropdown"
        :disabled="props.disabled"
        :class="[
          'flex items-center gap-1 px-1 py-0 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-md text-sm transition-colors',
          props.disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
        ]"
      >
        <span class="material-symbols-outlined text-gray-700 dark:text-gray-300 !text-sm">alternate_email</span>
        <div v-if="selectedContext.length === 0" class="pr-1">Add Context</div>
      </button>
      <!-- Selected Contexts -->
      <div
        v-for="item in selectedContext"
        :key="item.id"
        :class="[
          'flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 text-sm group h-6 max-w-[8rem]',
          props.disabled
            ? 'opacity-50'
            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
        ]"
      >
        <div class="group-hover:hidden">
          <span
            class="material-symbols-outlined text-gray-800 dark:text-gray-200 !text-sm"
            :class="props.disabled ? '' : 'cursor-pointer'"
          >{{ getContextIcon(item.type) }}</span>
        </div>
        <div class="hidden group-hover:flex">
          <span
            class="material-symbols-outlined text-gray-500 dark:text-gray-400 !text-sm"
            :class="props.disabled ? '' : 'cursor-pointer'"
            @click="props.disabled ? null : handleContextRemove(item.id)"
          >close</span>
        </div>
        <div class="truncate cursor-default text-gray-800 dark:text-gray-200">{{ item.name }}</div>
      </div>
    </div>

    <!-- Dropdown -->
    <div
      v-if="showDropdown"
      v-on-click-outside="resetDropdown"
      class="absolute left-0 bottom-full w-48 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 py-1 z-10"
    >
      <!-- Main Menu -->
      <div v-if="!selectedType">
        <div
          v-for="type in contextTypes"
          :key="type.type"
          class="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-800 dark:text-gray-200"
          @click="selectType(type.type)"
        >
          <span class="material-symbols-outlined text-gray-500 dark:text-gray-400 !text-sm">{{ type.icon }}</span>
          <span class="text-sm">{{ type.label }}</span>
          <span class="material-symbols-outlined text-gray-500 dark:text-gray-400 !text-sm ml-auto">chevron_right</span>
        </div>
      </div>

      <!-- Entity List with Search -->
      <div v-else class="flex flex-col">
        <!-- Back Button and Search -->
        <div class="px-2 flex gap-0 flex-row items-center">
          <button
            @click="selectedType = null"
            class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
          >
            <span class="material-symbols-outlined !text-xs">arrow_back</span>
          </button>
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="`Search ${contextTypes.find(t => t.type === selectedType)?.label}...`"
            class="w-full px-2 text-sm rounded-md focus:outline-none bg-transparent text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>

        <!-- Entity List -->
        <div class="max-h-48 overflow-y-auto" ref="entityListRef">
          <div
            v-for="item in paginatedFilteredContexts"
            :key="item.id"
            class="px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm flex items-center gap-2 text-gray-800 dark:text-gray-200"
            @click="handleContextSelect(item)"
          >
            <span class="material-symbols-outlined text-gray-500 dark:text-gray-400 !text-sm">{{ getContextIcon(item.type) }}</span>
            <span class="truncate">{{ item.name }}</span>
          </div>
          <div
            v-if="paginatedFilteredContexts.length === 0"
            class="px-2 py-1 text-sm text-gray-500 dark:text-gray-400 text-center"
          >
            No results found
          </div>
          <div v-if="isLoading && hasMoreItems" class="px-2 py-1 text-sm text-gray-500 dark:text-gray-400 text-center">
            Loading more...
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
