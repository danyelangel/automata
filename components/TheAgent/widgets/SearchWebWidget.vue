<script setup lang="ts">
import AgentStatusMessage from '../messages/AgentStatusMessage.vue'

interface Props {
  arguments: {
    query: string
    language: 'en' | 'es' | 'fr'
  }
  pending?: boolean
  status?: 'in_progress' | 'completed' | 'incomplete'
  call_id: string
}

const props = defineProps<Props>()
</script>

<template>
  <AgentStatusMessage
    v-if="pending"
    icon="globe"
    message="Searching the web..."
    status="pending"
    animate
    left-padding
  />
  <AgentStatusMessage
    v-else
    icon="globe"
    :message="`Searching web for: ${props.arguments.query} in ${props.arguments.language}`"
    status="completed"
  />
</template>
