<script setup lang="ts">
import { useTextareaAutosize } from '@vueuse/core'
import { ref, computed } from 'vue'

const newMessage = defineModel<string>('value', { required: true })

const props = defineProps<{
  disabled?: boolean
  isEditing?: boolean
  onSave?: (message: string) => void | Promise<void>
  onCancel?: () => void
  placeholder?: string
  disabledPlaceholder?: string
  editingPlaceholder?: string
}>()

const isLoading = computed(() => props.disabled)

const textarea = ref<HTMLTextAreaElement>()

useTextareaAutosize({
  element: textarea,
  input: newMessage,
})

const sendMessage = async () => {
  const messageText = newMessage.value
  if (!messageText?.trim() || isLoading.value) return

  try {
    if (props.isEditing && props.onSave) {
      // Editing mode: call the save handler
      await props.onSave(messageText)
    } else {
      // Creating mode: emit event
      emit('send', messageText)
      newMessage.value = ''
    }
  } catch {
    // Error handling could be improved with proper error reporting
  }
}

const cancelEdit = () => {
  if (props.onCancel) {
    props.onCancel()
  }
}

const emit = defineEmits<{
  (e: 'send', message: string): void
}>()

const defaultPlaceholder = 'Ask your agent to do anything'
const defaultDisabledPlaceholder = 'Agent working...'
const defaultEditingPlaceholder = 'Edit your message...'
</script>

<template>
  <div class="pl-2 pr-4 pb-4 relative">
    <div
      class="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-gray-50 dark:from-gray-950 to-transparent pointer-events-none"
    ></div>
    <div class="flex flex-col max-w-4xl mx-auto">
      <!-- Compose Input -->
      <div
        class="flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-1"
        :class="props.disabled ? 'dark:bg-gray-900' : ''"
      >
        <!-- Context Selector - only show when not editing and not disabled -->
        <slot name="context-selector" v-if="!props.disabled && !props.isEditing" />

        <!-- Textarea -->
        <textarea
          ref="textarea"
          v-model="newMessage"
          :class="props.disabled ? 'opacity-50 h-8' : ''"
          class="w-full resize-none p-2 text-sm focus:outline-none max-h-[calc(100vh-20rem)] bg-transparent dark:text-gray-100"
          :placeholder="
            props.disabled
              ? (disabledPlaceholder || defaultDisabledPlaceholder)
              : props.isEditing
                ? (editingPlaceholder || defaultEditingPlaceholder)
                : (placeholder || defaultPlaceholder)
          "
          @keydown.enter.prevent="sendMessage"
          :disabled="!!props.disabled"
        ></textarea>

        <!-- Bottom Actions -->
        <div class="flex justify-between items-center px-1">
          <!-- Tool and Model Selectors - only show when not editing and not disabled -->
          <div class="flex gap-2" v-if="!props.disabled && !props.isEditing">
            <slot name="tool-selector" />
            <slot name="model-selector" />
          </div>
          <!-- Spacer for editing mode -->
          <div v-else></div>

          <!-- Action Buttons -->
          <div class="flex gap-2 items-center">
            <!-- Cancel button for editing mode -->
            <button
              v-if="props.isEditing"
              @click="cancelEdit"
              class="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors focus:outline-none cursor-pointer text-xs font-medium px-2 py-1"
              aria-label="Cancel edit"
            >
              Cancel
            </button>

            <!-- Send/Save button -->
            <button
              v-if="!props.disabled"
              @click="sendMessage"
              class="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-white transition-colors focus:outline-none cursor-pointer"
              :disabled="isLoading"
              :aria-label="props.isEditing ? 'Save message' : 'Send message'"
            >
              <span class="material-symbols-outlined !text-lg" :class="{ 'opacity-50': isLoading }">
                {{ props.isEditing ? 'check' : 'send' }}
              </span>
            </button>

            <!-- Stop button when agent is running -->
            <slot name="stop-button" v-else />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
textarea {
  min-height: 42px;
  line-height: 1.5;
}
</style>
