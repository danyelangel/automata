<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'
import type { WidgetRegistry } from '../../widgets/WidgetRegistry'
import WidgetCard from '../widgets/WidgetCard.vue'
import UnknownFunctionWidget from '../widgets/UnknownFunctionWidget.vue'

interface Props {
  name: string
  arguments: string
  pending?: boolean
  status?: 'in_progress' | 'completed' | 'incomplete' | 'awaiting_tool'
  call_id: string
  updatedAt: number
  widgetRegistry?: WidgetRegistry
}

const props = defineProps<Props>()

const parsedArguments = computed(() => {
  try {
    return JSON.parse(props.arguments)
  } catch {
    return {}
  }
})

const selectedWidget = computed<Component | undefined>(() => {
  if (!props.widgetRegistry) {
    return undefined
  }
  // Try to get input widget for this function name
  return props.widgetRegistry.getInputWidget(props.name)
})
</script>

<template>
  <div class="w-full">
    <component
      v-if="selectedWidget"
      :is="selectedWidget"
      :arguments="parsedArguments"
      :function-name="name"
      :pending="pending"
      :status="status"
      :call_id="call_id"
      :updatedAt="updatedAt"
    />
    <UnknownFunctionWidget
      v-else
      :function-name="name"
      :arguments="arguments"
    />
  </div>
</template>
