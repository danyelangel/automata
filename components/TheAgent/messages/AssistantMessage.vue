<script setup lang="ts">
import type { OutputItem } from '../../../core/types/ui'
import { parseMarkdown } from '../../../utils/markdownParser'

defineProps<{
  message: OutputItem
}>()
</script>

<template>
  <div v-if="message.role === 'assistant'" class="flex justify-start w-full mb-3">
    <template v-if="typeof message.content !== 'string'">
      <div class="w-full text-gray-800 dark:text-gray-300 text-sm px-1" v-for="item in message.content" :key="item.id">
        <div v-html="parseMarkdown(item.text || '')" />
      </div>
    </template>
    <div v-else class="w-full text-gray-800 dark:text-gray-300 text-sm px-1 whitespace-pre-wrap">
      <div v-html="parseMarkdown(message.content)" />
    </div>
  </div>
</template>
