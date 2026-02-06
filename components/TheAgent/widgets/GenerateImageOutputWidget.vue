<script setup lang="ts">
interface Props {
  arguments: {
    url: string
  }
  status?: 'in_progress' | 'completed' | 'incomplete'
  pending?: boolean
  call_id: string
}

const props = defineProps<Props>()
</script>

<template>
  <div class="flex flex-col gap-2 -mt-0">
    <div class="flex ml-4 mb-4 flex-row gap-2 items-start justify-start text-xs max-w-sm">
      <img :src="props.arguments.url" class="w-full rounded-md" alt="Generated image" />
    </div>
  </div>
</template>
