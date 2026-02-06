/**
 * Re-export history/message item types for agent UI.
 * Item is the union type used for conversation history entries.
 */
export type {
  InputStatus,
  InputItem,
  OutputItem,
  FunctionCallItem,
  FunctionCallOutputItem,
} from '../../core/types/ui'
export type { MessageItem } from '../../core/types/ui'
import type { MessageItem } from '../../core/types/ui'

/** Union type for a single conversation history entry */
export type Item = MessageItem
