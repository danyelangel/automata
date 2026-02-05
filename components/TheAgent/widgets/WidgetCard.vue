<script setup lang="ts">
interface Props {
  title?: string
  description?: string
  pending?: boolean
}

defineProps<Props>()
</script>

<template>
  <div
    class="p-4 mx-auto gap-4 flex flex-col"
  >
    <div v-if="title || description" class="flex flex-col">
      <h2 v-if="title" class="text-sm font-semibold text-gray-800 dark:text-gray-200">{{ title }}</h2>
      <div v-if="description" class="text-gray-500 dark:text-gray-400 text-sm">{{ description }}</div>
    </div>
    <slot></slot>
  </div>
</template>
