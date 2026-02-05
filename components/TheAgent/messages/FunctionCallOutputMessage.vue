<script setup lang="ts">
import { computed } from 'vue'
import type { FunctionCallOutputItem, MessageItem } from '../../../types/ui'
import type { WidgetRegistry } from '../../widgets/WidgetRegistry'
import AgentStatusMessage from './AgentStatusMessage.vue'
import FunctionCallMessage from './FunctionCallMessage.vue'

const props = defineProps<{
  message: FunctionCallOutputItem
  messages: MessageItem[]
  index: number
  widgetRegistry?: WidgetRegistry
  updatedAt?: number
}>()

const parseJson = (json: string) => {
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

const getOutputName = () => {
  const previousMessage = props.messages[props.index - 1]
  if (previousMessage && 'name' in previousMessage) {
    return `${previousMessage.name}Output`
  }
  return 'Output'
}

const selectedWidget = computed(() => {
  if (!props.widgetRegistry) {
    return undefined
  }
  const outputName = getOutputName()
  return props.widgetRegistry.getOutputWidget(outputName)
})
</script>

<template>
  <div class="flex flex-col justify-start w-full">
    <div v-if="selectedWidget" class="w-full">
      <component
        :is="selectedWidget"
        :arguments="parseJson(message.output) || {}"
        :function-name="getOutputName()"
        :pending="message.status === 'in_progress'"
        :status="message.status"
        :call_id="message.call_id"
        :updatedAt="updatedAt || Date.now()"
      />
    </div>
    <FunctionCallMessage
      v-else
      :name="getOutputName()"
      :arguments="message.output"
      :pending="message.status === 'in_progress'"
      :call_id="message.call_id"
      :status="message.status"
      :updatedAt="updatedAt || Date.now()"
      :widget-registry="widgetRegistry"
    />
    <AgentStatusMessage
      v-if="parseJson(message.output)?.error"
      icon="warning"
      :message="parseJson(message.output)?.error"
      status="warning"
      class="pb-4 mr-2"
    />
  </div>
</template>
