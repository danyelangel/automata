<script setup lang="ts">
import WidgetCard from './WidgetCard.vue'

interface Props {
  functionName: string
  arguments: string
}

defineProps<Props>()
</script>

<template>
  <WidgetCard
    :title="functionName"
    description="Function call details"
    class="border-2 border-red-300 bg-gradient-to-br from-red-50 to-red-100 shadow-lg shadow-red-100"
  >
    <div class="flex text-sm items-center gap-2">
      <span class="material-symbols-outlined text-red-500 !text-base">error</span>
      <div class="flex-1">
        <div class="text-red-600 font-medium">Unknown action encountered</div>
      </div>
    </div>
  </WidgetCard>
</template>
