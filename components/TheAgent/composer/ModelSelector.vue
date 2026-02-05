<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  disabled?: boolean
  selectedModel: string
  models?: string[]
  onModelChange?: (model: string) => void
}>()

const emit = defineEmits<{
  (e: 'model-change', model: string): void
}>()

const defaultModels = ['gpt-5.2', 'gpt-5.1', 'gpt-5', 'gpt-5-mini']

const models = computed(() => props.models || defaultModels)

const handleChange = (model: string) => {
  if (props.onModelChange) {
    props.onModelChange(model)
  } else {
    emit('model-change', model)
  }
}
</script>

<template>
  <div class="flex items-center gap-2">
    <select
      :value="selectedModel"
      @change="handleChange(($event.target as HTMLSelectElement).value)"
      :disabled="props.disabled"
      :class="[
        'text-xs font-semibold appearance-none focus:outline-none dark:text-gray-400',
        props.disabled ? 'opacity-50 cursor-not-allowed' : '',
      ]"
    >
      <option v-for="model in models" :key="model" :value="model">{{ model }}</option>
    </select>
  </div>
</template>
