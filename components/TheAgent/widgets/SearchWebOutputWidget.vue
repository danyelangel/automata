<script setup lang="ts">
import { computed } from 'vue'
import AgentStatusMessage from '../messages/AgentStatusMessage.vue'

interface Props {
  arguments: {
    content: string
    search_results?: {
      title: string
      url: string
      snippet: string
      published_date?: string
      author?: string
    }[]
  }
  status?: 'in_progress' | 'completed' | 'incomplete'
  pending?: boolean
  call_id: string
}

const props = defineProps<Props>()

const webSources = computed(() => {
  if (!props.arguments.search_results) return []
  return props.arguments.search_results
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <AgentStatusMessage
      icon="globe"
      :message="`${props.arguments.search_results?.length || 0} sources found`"
      status="completed"
    />
    <div class="flex mb-4 flex-row gap-2 items-start justify-start text-xs max-w-4xl">
      <div class="w-full">
        <div
          v-if="webSources.length > 0"
          class="space-y-2 rounded-lg p-3 bg-gray-50 dark:bg-gray-900"
        >
          <div v-for="(source, index) in webSources" :key="index" class="">
            <div class="flex flex-col gap-2">
              <!-- URL -->
              <div class="flex items-start gap-2 min-w-0">
                <span class="material-symbols-outlined text-gray-500 !text-sm shrink-0">link</span>
                <a
                  :href="source.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  :title="source.url"
                  class="text-gray-700 dark:text-gray-300 hover:underline text-xs block whitespace-nowrap overflow-hidden text-ellipsis flex-1 max-w-full"
                >
                  {{ source.url }}
                </a>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-gray-500 dark:text-gray-400 text-sm">
          No web sources found
        </div>
      </div>
    </div>
  </div>
</template>
