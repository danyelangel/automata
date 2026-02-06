<script setup lang="ts">
import type { FunctionCallItem, MessageItem } from '../../../core/types/ui'
import type { WidgetRegistry } from '../../widgets/WidgetRegistry'
import FunctionCallMessage from './FunctionCallMessage.vue'

const props = defineProps<{
  message: FunctionCallItem
  messages: MessageItem[]
  index: number
  widgetRegistry?: WidgetRegistry
  updatedAt?: number
}>()
</script>

<template>
  <div class="flex justify-start w-full mb-3">
    <FunctionCallMessage
      :name="props.message.name"
      :arguments="props.message.arguments"
      :pending="props.message.status === 'in_progress'"
      :call_id="props.message.call_id"
      :status="props.messages[props.index + 1] ? 'completed' : 'awaiting_tool'"
      :updatedAt="updatedAt || Date.now()"
      :widget-registry="widgetRegistry"
    />
  </div>
</template>
