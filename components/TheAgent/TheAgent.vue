<script setup lang="ts">
import { ref, computed } from 'vue'
import type { MessageItem } from '../../core/types/ui'
import type { WidgetRegistry } from '../widgets/WidgetRegistry'
import ComposeMessage from './composer/ComposeMessage.vue'
import MessageList from './MessageList.vue'

const props = defineProps<{
  messages: MessageItem[]
  widgetRegistry?: WidgetRegistry
  agentStatus?: 'running' | 'awaiting_tool' | 'idle' | 'paused'
  loading?: boolean
  updatedAt?: number
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'send', message: string): void
  (e: 'select-suggestion', suggestion: string): void
  (e: 'edit', message: string): void
  (e: 'reload'): void
}>()

const messageHistory = computed(() => props.messages || [])

const hasPendingMessages = computed(() => {
  return messageHistory.value.some((message) => message.status === 'in_progress')
})

const newMessage = ref('')

const handleSuggestionSelect = (suggestion: string) => {
  newMessage.value = suggestion
  emit('select-suggestion', suggestion)
}

const handleSend = (message: string) => {
  emit('send', message)
  newMessage.value = ''
}
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-64px)] bg-gray-50 dark:bg-gray-950">
    <!-- Messages Section -->
    <MessageList
      :messages="messageHistory"
      :widget-registry="widgetRegistry"
      :agent-status="agentStatus"
      :updatedAt="updatedAt"
      @select-suggestion="handleSuggestionSelect"
    >
      <template #composer="{ value, onSave, onCancel, isEditing }">
        <slot name="composer" :value="value" :on-save="onSave" :on-cancel="onCancel" :is-editing="isEditing" />
      </template>
      <template #empty-state="{ suggestions, selectSuggestion }">
        <slot name="empty-state" :suggestions="suggestions" :select-suggestion="selectSuggestion" />
      </template>
    </MessageList>

    <!-- Compose Section -->
    <ComposeMessage
      v-show="!hasPendingMessages"
      v-model:value="newMessage"
      :disabled="disabled || loading"
      @send="handleSend"
    >
      <template #context-selector>
        <slot name="context-selector" />
      </template>
      <template #tool-selector>
        <slot name="tool-selector" />
      </template>
      <template #model-selector>
        <slot name="model-selector" />
      </template>
      <template #stop-button>
        <slot name="stop-button" />
      </template>
    </ComposeMessage>
  </div>
</template>

<style scoped>
textarea {
  min-height: 42px;
  line-height: 1.5;
}
</style>
