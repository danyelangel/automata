<script setup lang="ts">
import { useScroll } from '@vueuse/core'
import { ref, watch, onUnmounted } from 'vue'
import type { MessageItem } from '../../core/types/ui'
import type { WidgetRegistry } from '../widgets/WidgetRegistry'
import {
  UserMessage,
  AssistantMessage,
  FunctionCallInputMessage,
  FunctionCallOutputMessage,
  AgentStatusMessage,
} from './messages'

const props = defineProps<{
  messages: MessageItem[]
  widgetRegistry?: WidgetRegistry
  agentStatus?: 'running' | 'awaiting_tool' | 'idle' | 'paused'
  updatedAt?: number
}>()

// define emit @select-suggestion="handleSuggestionSelect"
const emit = defineEmits<{
  (e: 'select-suggestion', suggestion: string): void
}>()

const messagesContainer = ref<HTMLElement | null>(null)
useScroll(messagesContainer)

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

let scrollTimeout: number | null = null
let scrollTimeout2: number | null = null

// Scroll to bottom when messages change
watch(
  () => props.messages,
  () => {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
    }
    if (scrollTimeout2) {
      clearTimeout(scrollTimeout2)
    }
    scrollTimeout = window.setTimeout(scrollToBottom, 100)
    scrollTimeout2 = window.setTimeout(scrollToBottom, 1000)
  },
  { deep: true, immediate: true }
)

onUnmounted(() => {
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
    scrollTimeout = null
  }
})

const selectSuggestion = (suggestion: string) => {
  emit('select-suggestion', suggestion)
}

const defaultSuggestions = [
  'Generate content briefs',
  'Generate an article',
  'Generate an image',
]
</script>

<template>
  <div ref="messagesContainer" class="flex-1 overflow-y-auto pl-2 pr-4 py-6">
    <div v-if="messages.length > 0" class="flex flex-col pb-12">
      <template v-for="(message, index) in messages" :key="index">
        <!-- User Message -->
        <UserMessage
          v-if="message.type === 'message' && message.role === 'user'"
          :message="message as any"
          :enable-editing="true"
        >
          <template #composer="{ value, onSave, onCancel, isEditing }">
            <slot name="composer" :value="value" :on-save="onSave" :on-cancel="onCancel" :is-editing="isEditing" />
          </template>
        </UserMessage>

        <!-- Assistant Message -->
        <AssistantMessage
          v-if="message.type === 'message' && message.role === 'assistant'"
          :message="message as any"
        />

        <!-- Function Call Input Message -->
        <FunctionCallInputMessage
          v-if="message.type === 'function_call'"
          :message="message as any"
          :messages="messages"
          :index="index"
          :widget-registry="widgetRegistry"
          :updatedAt="updatedAt"
        />

        <!-- Function Call Output Message -->
        <FunctionCallOutputMessage
          v-if="message.type === 'function_call_output'"
          :message="message as any"
          :messages="messages"
          :index="index"
          :widget-registry="widgetRegistry"
          :updatedAt="updatedAt"
        />
      </template>
      <AgentStatusMessage
        v-if="agentStatus === 'running'"
        icon="wand_stars"
        message="Thinking..."
        status="pending"
        animate
      />
      <AgentStatusMessage
        v-else-if="agentStatus === 'awaiting_tool'"
        icon="hourglass_empty"
        message="Processing..."
        status="pending"
        animate
      />
    </div>

    <!-- Empty State -->
    <div v-else class="flex flex-col items-center justify-center h-full text-center px-4 mb-16">
      <slot name="empty-state" :suggestions="defaultSuggestions" :select-suggestion="selectSuggestion">
        <div class="flex flex-col items-center justify-center">
          <div class="my-8">
            <img
              src="https://krak-landing.web.app/feature-2-3.png"
              alt="Agent"
              class="w-40 h-40 object-contain opacity-70 invert hue-rotate-180 dark:border-0 border border-gray-800 rounded-xl dark:invert-0 dark:hue-rotate-0"
              style="mix-blend-mode: darken"
            />
          </div>
          <div class="flex flex-col items-center justify-center">
            <h3 class="text-3xl font-semibold font-poppins text-gray-800 dark:text-gray-200 mb-2">
              Agent
            </h3>
            <p class="text-gray-600 font-poppins dark:text-gray-400 mb-8 max-w-xs">
              I can help you with various tasks. Here are some things you can ask me to do:
            </p>
          </div>
        </div>

        <div class="space-y-4 w-full max-w-md">
          <button
            v-for="(suggestion, index) in defaultSuggestions"
            :key="index"
            @click="selectSuggestion(suggestion)"
            class="w-full bg-white dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-300 cursor-pointer font-poppins font-semibold py-3 px-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 transition-colors"
          >
            {{ suggestion }}
          </button>
        </div>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active {
  transition: opacity 0.3s ease;
}

.fade-leave-active {
  transition: opacity 0s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

textarea {
  line-height: 1.5;
}
</style>
