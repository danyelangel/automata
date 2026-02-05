<script setup lang="ts">
import { ref } from 'vue'
import type { InputItem } from '../../../types/ui'

const props = defineProps<{
  message: InputItem
  enableEditing?: boolean
  onEdit?: (newMessage: string) => void | Promise<void>
  onReload?: () => void | Promise<void>
}>()

// Editing state
const isEditing = ref(false)
const editingText = ref('')

const startEditing = () => {
  isEditing.value = true
  editingText.value = props.message.content as string
}

const cancelEditing = () => {
  isEditing.value = false
  editingText.value = ''
}

const saveEdit = async (newMessage: string) => {
  try {
    if (props.enableEditing && props.onEdit && newMessage.trim()) {
      isEditing.value = false
      await props.onEdit(newMessage.trim())
      editingText.value = ''
    }
  } catch {
    // Keep editing mode open on error so user can try again
  }
}

const reloadMessage = async () => {
  try {
    if (props.enableEditing && props.onReload && props.message.content) {
      await props.onReload()
    }
  } catch {
    // Error reloading message
  }
}

// Emit events for editing
const emit = defineEmits<{
  (e: 'edit', message: string): void
  (e: 'reload'): void
}>()

const handleSave = async (text: string) => {
  if (props.onEdit) {
    await saveEdit(text)
  } else {
    emit('edit', text)
  }
}

const handleReload = async () => {
  if (props.onReload) {
    await reloadMessage()
  } else {
    emit('reload')
  }
}
</script>

<template>
  <div
    v-if="message.role === 'user' && !(message.content as string).includes('___KRAK_INTERNAL___')"
    class="flex justify-end mb-3"
  >
    <div class="w-full flex flex-row gap-2 items-end justify-end group relative">
      <!-- Editing Mode -->
      <div v-if="isEditing" class="w-full">
        <slot name="composer" :value="editingText" :on-save="handleSave" :on-cancel="cancelEditing" :is-editing="true">
          <!-- Default composer slot - should be provided by parent -->
        </slot>
      </div>

      <!-- Display Mode -->
      <template v-else>
        <!-- Edit button (only visible on hover when editing is enabled) -->
        <button
          v-if="enableEditing"
          @click="startEditing"
          class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded cursor-pointer"
          aria-label="Edit message"
        >
          <span class="material-symbols-outlined !text-sm">edit</span>
        </button>

        <!-- Reload button (only visible on hover when editing is enabled) -->
        <button
          v-if="enableEditing"
          @click="handleReload"
          class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded cursor-pointer"
          aria-label="Reload message"
        >
          <span class="material-symbols-outlined !text-sm">refresh</span>
        </button>

        <!-- Message content -->
        <div
          class="bg-gray-200 dark:bg-gray-800/50 text-gray-800 dark:text-gray-100 text-sm rounded-2xl shadow-sm px-3 py-2 max-w-[70%] break-words"
        >
          {{ message.content }}
        </div>
      </template>
    </div>
  </div>
</template>
