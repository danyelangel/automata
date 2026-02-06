import { describe, it, expect } from 'vitest'
import { buildAgentSystemPrompt, DEFAULT_SYSTEM_PROMPT } from './systemPrompt'
import type { CloudAgent } from '../types'

describe('System Prompt Builder', () => {
  const mockAgent: CloudAgent = {
    projectId: 'project-1',
    model: 'gpt-4.1',
    tools: [
      { type: 'function', name: 'Tool1', description: 'First tool' },
      { type: 'function', name: 'Tool2', description: 'Second tool' },
      { type: 'image', name: 'ImageTool', description: 'Image tool' } // Should be filtered
    ],
    context: [
      { id: 'ctx-1', type: 'article', name: 'Test Article' },
      { id: 'ctx-2', type: 'site', name: 'Test Site' }
    ],
    history: []
  }

  const mockRulebook = [
    { content: 'Always be helpful' },
    { content: 'Follow user instructions' }
  ]

  describe('Default behavior (no config)', () => {
    it('should build a complete system prompt with all default sections', () => {
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook)

      // Check for all default sections
      expect(prompt).toContain('<role>autonomous_agent</role>')
      expect(prompt).toContain('<purpose>Execute tasks independently')
      expect(prompt).toContain('<core_principles>')
      expect(prompt).toContain('<communication>')
      expect(prompt).toContain('<execution>')
      expect(prompt).toContain('<agent_rulebook>')
      expect(prompt).toContain('<user_context>')
      expect(prompt).toContain('<available_tools>')
      expect(prompt).toContain('<date_time>')
      expect(prompt).toContain('<timezone>')

      // Check rulebook content
      expect(prompt).toContain('<rule>Always be helpful</rule>')
      expect(prompt).toContain('<rule>Follow user instructions</rule>')

      // Check user context content
      expect(prompt).toContain('<type>article</type>')
      expect(prompt).toContain('<name>Test Article</name>')

      // Check tools content (image type should be filtered)
      expect(prompt).toContain('<name>Tool1</name>')
      expect(prompt).toContain('<name>Tool2</name>')
      expect(prompt).not.toContain('<name>ImageTool</name>')
    })

    it('should handle empty context and tools', () => {
      const minimalAgent: CloudAgent = {
        projectId: 'project-1',
        model: 'gpt-4.1',
        tools: [],
        context: [],
        history: []
      }

      const prompt = buildAgentSystemPrompt(minimalAgent, [])

      expect(prompt).toContain('<role>')
      // Empty arrays in default config are excluded
      expect(prompt).not.toContain('<user_context>')
      expect(prompt).not.toContain('<available_tools>')
    })
  })

  describe('Custom configuration', () => {
    it('should build prompt with custom role and purpose', () => {
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        role: 'content_creator',
        purpose: 'Generate engaging content'
      })

      expect(prompt).toContain('<role>content_creator</role>')
      expect(prompt).toContain('<purpose>Generate engaging content</purpose>')
      
      // Should not include omitted sections
      expect(prompt).not.toContain('<core_principles>')
      expect(prompt).not.toContain('<communication>')
      expect(prompt).not.toContain('<agent_rulebook>')
    })

    it('should include core principles when provided', () => {
      const principles = ['Be accurate', 'Be helpful', 'Be concise']
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        corePrinciples: principles
      })

      expect(prompt).toContain('<core_principles>')
      expect(prompt).toContain('<principle>Be accurate</principle>')
      expect(prompt).toContain('<principle>Be helpful</principle>')
      expect(prompt).toContain('<principle>Be concise</principle>')
    })

    it('should include additional instructions when provided', () => {
      const additional = '<note>Use markdown formatting</note>'
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        additionalInstructions: additional
      })

      expect(prompt).toContain(additional)
    })

    it('should use custom date/time when string provided', () => {
      const customDate = '2024-01-15T10:30:00Z'
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        dateTime: customDate
      })

      expect(prompt).toContain(`<date_time>${customDate}</date_time>`)
    })

    it('should use current date/time when true provided', () => {
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        dateTime: true
      })

      expect(prompt).toMatch(/<date_time>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should use custom timezone when string provided', () => {
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        timezone: 'America/New_York'
      })

      expect(prompt).toContain('<timezone>America/New_York</timezone>')
    })

    it('should use custom rulebook when provided', () => {
      const customRules = [{ content: 'Custom rule 1' }, { content: 'Custom rule 2' }]
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        rulebook: customRules
      })

      expect(prompt).toContain('Custom rule 1')
      expect(prompt).toContain('Custom rule 2')
      expect(prompt).not.toContain('Always be helpful')
    })

    it('should use custom context when provided', () => {
      const customContext = [{ id: 'c1', type: 'custom', name: 'Custom Item' }]
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        userContext: customContext
      })

      expect(prompt).toContain('Custom Item')
      expect(prompt).not.toContain('Test Article')
    })

    it('should work with empty config object', () => {
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {})
      expect(prompt.trim()).toBe('')
    })
  })

  describe('Exported defaults', () => {
    it('should export DEFAULT_SYSTEM_PROMPT as XmlTag array', () => {
      expect(Array.isArray(DEFAULT_SYSTEM_PROMPT)).toBe(true)
      expect(DEFAULT_SYSTEM_PROMPT.length).toBeGreaterThan(0)
      
      // Check structure
      const roleTag = DEFAULT_SYSTEM_PROMPT.find(tag => tag.tag === 'role')
      expect(roleTag).toBeDefined()
      expect(roleTag?.value).toBe('autonomous_agent')
      
      const purposeTag = DEFAULT_SYSTEM_PROMPT.find(tag => tag.tag === 'purpose')
      expect(purposeTag).toBeDefined()
      expect(String(purposeTag?.value)).toContain('Execute tasks independently')
    })
  })

  describe('XmlTag structure support', () => {
    it('should build prompt from XmlTag array', () => {
      const xmlTags = [
        { tag: 'role', value: 'test_agent' },
        { tag: 'purpose', value: 'Test purpose' },
        {
          tag: 'core_principles',
          value: [
            { tag: 'principle', value: 'Principle 1' },
            { tag: 'principle', value: 'Principle 2' }
          ]
        }
      ]

      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, xmlTags)

      expect(prompt).toContain('<role>test_agent</role>')
      expect(prompt).toContain('<purpose>Test purpose</purpose>')
      expect(prompt).toContain('<core_principles>')
      expect(prompt).toContain('<principle>Principle 1</principle>')
      expect(prompt).toContain('<principle>Principle 2</principle>')
    })

    it('should handle nested XmlTag structures', () => {
      const xmlTags = [
        {
          tag: 'instructions',
          value: [
            { tag: 'role', value: 'nested_agent' },
            { tag: 'purpose', value: 'Nested purpose' }
          ]
        }
      ]

      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, xmlTags)

      expect(prompt).toContain('<instructions>')
      expect(prompt).toContain('<role>nested_agent</role>')
      expect(prompt).toContain('<purpose>Nested purpose</purpose>')
      expect(prompt).toContain('</instructions>')
    })

    it('should handle primitive values in XmlTag', () => {
      const xmlTags = [
        { tag: 'role', value: 'primitive_agent' },
        { tag: 'count', value: 42 },
        { tag: 'enabled', value: true }
      ]

      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, xmlTags)

      expect(prompt).toContain('<role>primitive_agent</role>')
      expect(prompt).toContain('<count>42</count>')
      expect(prompt).toContain('<enabled>true</enabled>')
    })
  })
})
