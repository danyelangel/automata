<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /** The Material Symbols icon name */
  icon: string
  /** The main status message text */
  message: string
  /** Additional details to show below the main message */
  details?: string
  /** The status state of the message */
  status?: 'pending' | 'completed' | 'incomplete' | 'warning'
  /** Whether to show the flicker animation (for pending states) */
  animate?: boolean
  /** Custom icon color class */
  iconColor?: string
  /** Custom text color class */
  textColor?: string
  /** Whether to show the message with left padding (like some widgets do) */
  leftPadding?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  status: 'completed',
  animate: false,
  iconColor: '',
  textColor: '',
  leftPadding: false
})

// Compute color based on status (same for icon and text)
const computedColor = computed(() => {
  // Use custom colors if provided
  if (props.iconColor) return props.iconColor
  if (props.textColor) return props.textColor

  switch (props.status) {
    case 'pending':
      return 'text-gray-600 dark:text-gray-300'
    case 'completed':
      return 'text-gray-600 dark:text-gray-300'
    case 'incomplete':
    case 'warning':
      return 'text-gray-400 dark:text-gray-600'
    default:
      return 'text-gray-600 dark:text-gray-300'
  }
})

// Compute animation class
const animationClass = computed(() => {
  return props.animate ? 'animate-flicker' : ''
})

// Compute padding class
const paddingClass = computed(() => {
  return props.leftPadding ? 'pl-4' : ''
})
</script>

<template>
  <div
    class="flex flex-row gap-1 items-start text-xs"
    :class="[animationClass, paddingClass]"
  >
    <span
      class="material-symbols-outlined !text-sm"
      style="margin-top: -2px;"
      :class="computedColor"
    >
      {{ icon }}
    </span>
    <div
      class="font-semibold"
      :class="computedColor"
    >
      {{ message }}
      <div
        v-if="details"
        class="text-gray-500 dark:text-gray-500 font-medium text-xs mt-1"
      >
        {{ details }}
      </div>
    </div>
  </div>
</template>
