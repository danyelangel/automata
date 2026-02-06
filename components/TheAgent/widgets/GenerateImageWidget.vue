<script setup lang="ts">
import AgentStatusMessage from '../messages/AgentStatusMessage.vue'

interface Props {
  arguments: {
    prompt: string
    size?: string
    transparentBackground?: boolean
    format: 'png' | 'jpg'
  }
  updatedAt?: number
  status?: 'in_progress' | 'completed' | 'incomplete' | 'awaiting_tool'
  pending?: boolean
  call_id: string
}

const props = defineProps<Props>()
</script>

<template>
  <AgentStatusMessage
    v-if="pending || status === 'awaiting_tool'"
    icon="image"
    message="Generating image..."
    :details="props.arguments.prompt"
    status="pending"
    animate
    left-padding
  />
  <AgentStatusMessage
    v-else
    icon="image"
    message="Generating image"
    :details="props.arguments.prompt"
    status="completed"
  />
</template>
