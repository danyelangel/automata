/**
 * Types for agent UI components
 */

export type InputStatus = 'in_progress' | 'completed' | 'incomplete' | 'awaiting_tool'

export interface InputItem {
  content:
    | string
    | {
        type: 'input_text' | 'input_image' | 'output_text'
        text?: string
        image_url?: string
      }[]
  role: 'system' | 'user' | 'developer' | 'assistant'
  status?: InputStatus
  type: 'message'
}

export interface OutputItem {
  content:
    | string
    | {
        id: string
        text: string
        type: 'output_text'
      }[]
  id: string
  role: 'assistant'
  status: InputStatus
  type: 'message'
}

export interface FunctionCallItem {
  arguments: string
  call_id: string
  name: string
  type: 'function_call'
  id?: string
  status?: InputStatus
}

export interface FunctionCallOutputItem {
  call_id: string
  output: string
  type: 'function_call_output'
  id?: string
  status?: InputStatus
}

export type MessageItem = InputItem | OutputItem | FunctionCallItem | FunctionCallOutputItem
