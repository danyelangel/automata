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
} from '../../types/ui'
export type { MessageItem } from '../../types/ui'
import type { MessageItem } from '../../types/ui'

/** Union type for a single conversation history entry */
export type Item = MessageItem
