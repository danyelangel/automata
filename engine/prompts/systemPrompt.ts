import type { CloudAgent, SystemPromptConfig, XmlTag, ContextItem, ToolItem } from '../types'
import { DEFAULT_SYSTEM_PROMPT } from './defaults'

// Re-export defaults
export { DEFAULT_SYSTEM_PROMPT } from './defaults'

/**
 * Convert XmlTag structure to XML string
 */
function xmlTagToString(xmlTag: XmlTag): string {
  const { tag, value } = xmlTag

  // Handle nested XmlTag
  if (typeof value === 'object' && value !== null && !Array.isArray(value) && 'tag' in value) {
    return `<${tag}>\n${xmlTagToString(value as XmlTag)}\n</${tag}>`
  }

  // Handle array of XmlTags
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && 'tag' in value[0]) {
    return `<${tag}>\n${value.map(item => xmlTagToString(item as XmlTag)).join('\n')}\n</${tag}>`
  }

  // Handle primitive values
  const content = String(value)
  const multiline = content.includes('\n') || content.includes('<')
  return multiline ? `<${tag}>\n${content}\n</${tag}>` : `<${tag}>${content}</${tag}>`
}

/**
 * Convert flat config object to XmlTag array
 */
function flatConfigToXmlTags(config: Record<string, any>): XmlTag[] {
  const tags: XmlTag[] = []
  const tagNameMap: Record<string, string> = {
    userContext: 'user_context',
    corePrinciples: 'core_principles',
    rulebook: 'agent_rulebook',
    tools: 'available_tools',
    dateTime: 'date_time'
  }

  for (const [key, value] of Object.entries(config)) {
    if (value === undefined) continue

    // Handle dynamic fields
    let processedValue = value
    if (key === 'dateTime' && value === true) {
      processedValue = new Date().toISOString()
    } else if (key === 'timezone' && value === true) {
      processedValue = Intl.DateTimeFormat().resolvedOptions().timeZone
    }

    // Skip additionalInstructions (raw content, no tag)
    if (key === 'additionalInstructions') {
      tags.push({ tag: '', value: String(processedValue) })
      continue
    }

    const tag = tagNameMap[key] || key.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`)
    
    // Convert value to XmlTag value format
    let xmlValue: XmlTag['value'] = processedValue
    
    if (Array.isArray(processedValue)) {
      if (processedValue.length === 0) continue
      
      if (key === 'corePrinciples') {
        xmlValue = processedValue.map((p: string) => ({ tag: 'principle', value: p }))
      } else if (key === 'rulebook') {
        xmlValue = processedValue.map((r: { content: string }) => ({ tag: 'rule', value: r.content }))
      } else if (key === 'userContext') {
        xmlValue = processedValue.map((item: ContextItem) => ({
          tag: 'item',
          value: [
            { tag: 'type', value: item.type },
            { tag: 'id', value: item.id },
            { tag: 'name', value: item.name }
          ]
        }))
      } else if (key === 'tools') {
        const filtered = processedValue.filter((t: ToolItem) => t.type !== 'image')
        if (filtered.length === 0) continue
        xmlValue = filtered.map((tool: ToolItem) => ({
          tag: 'tool',
          value: [
            { tag: 'type', value: tool.type },
            { tag: 'name', value: tool.name }
          ]
        }))
      }
    }

    tags.push({ tag, value: xmlValue })
  }

  return tags
}

/**
 * Builds the system prompt for an agent.
 * Config uses presence/absence pattern: if a field is present, include it; if absent, exclude it.
 * If no config provided, uses defaults from agent and rulebook parameters.
 * 
 * Supports two formats:
 * 1. Flat config object (backward compatible)
 * 2. XmlTag[] structure for nested XML
 * 
 * @param agent - The agent configuration
 * @param rulebook - Project-specific rules (only used if config.rulebook not provided)
 * @param config - Configuration options for the prompt (presence = include, absence = exclude)
 * @returns The complete system prompt
 */
export function buildAgentSystemPrompt(
  agent: CloudAgent,
  rulebook: Array<{ content: string }> = [],
  config?: SystemPromptConfig
): string {
  // If no config provided, use default behavior (include everything)
  if (!config) {
    return buildDefaultSystemPrompt(agent, rulebook)
  }

  // Convert to XmlTag[] if flat config object
  const tags: XmlTag[] = Array.isArray(config) && config.length > 0 && 'tag' in config[0]
    ? config
    : flatConfigToXmlTags(config as Record<string, any>)

  // Convert XmlTags to XML strings, handling raw content (empty tag)
  return tags
    .map(tag => tag.tag === '' ? String(tag.value) : xmlTagToString(tag))
    .join('\n')
}

/**
 * Builds a default system prompt with all sections included
 * @internal
 */
function buildDefaultSystemPrompt(
  agent: CloudAgent,
  rulebook: Array<{ content: string }>
): string {
  const tags: XmlTag[] = [...DEFAULT_SYSTEM_PROMPT]

  if (rulebook.length > 0) {
    tags.push({
      tag: 'agent_rulebook',
      value: rulebook.map(rule => ({ tag: 'rule', value: rule.content }))
    })
  }

  if (agent.context.length > 0) {
    tags.push({
      tag: 'user_context',
      value: agent.context.map(item => ({
        tag: 'item',
        value: [
          { tag: 'type', value: item.type },
          { tag: 'id', value: item.id },
          { tag: 'name', value: item.name }
        ]
      }))
    })
  }

  const nonImageTools = agent.tools.filter(tool => tool.type !== 'image')
  if (nonImageTools.length > 0) {
    tags.push({
      tag: 'available_tools',
      value: nonImageTools.map(tool => ({
        tag: 'tool',
        value: [
          { tag: 'type', value: tool.type },
          { tag: 'name', value: tool.name }
        ]
      }))
    })
  }

  tags.push(
    { tag: 'date_time', value: new Date().toISOString() },
    { tag: 'timezone', value: Intl.DateTimeFormat().resolvedOptions().timeZone }
  )

  return tags.map(tag => xmlTagToString(tag)).join('\n')
}
