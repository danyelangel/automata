import { describe, it, expect } from 'vitest'
import { buildAgentSystemPrompt } from './systemPrompt'
import type { CloudAgent } from '../types'

describe('System Prompt Configuration - Presence/Absence Pattern', () => {
  const mockAgent: CloudAgent = {
    projectId: 'project-1',
    model: 'gpt-4.1',
    tools: [
      { type: 'search', name: 'SearchWeb' },
      { type: 'browser', name: 'BrowserNavigate' }
    ],
    context: [
      { id: 'p1', type: 'project', name: 'My Project' },
      { id: 'u1', type: 'user', name: 'John Doe' }
    ],
    history: []
  }

  const mockRulebook = [
    { content: 'Always be polite' },
    { content: 'Use proper formatting' }
  ]

  describe('role field', () => {
    it('should include role when provided', () => {
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        role: 'custom_assistant'
      })
      expect(prompt).toContain('<role>custom_assistant</role>')
    })

    it('should exclude role when omitted', () => {
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        purpose: 'Some purpose'
      })
      expect(prompt).not.toContain('<role>')
    })
  })

  describe('purpose field', () => {
    it('should include purpose when provided', () => {
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        purpose: 'Generate creative content'
      })
      expect(prompt).toContain('<purpose>Generate creative content</purpose>')
    })

    it('should exclude purpose when omitted', () => {
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        role: 'assistant'
      })
      expect(prompt).not.toContain('<purpose>')
    })
  })

  describe('corePrinciples field', () => {
    it('should include core principles when provided', () => {
      const principles = ['Be accurate', 'Be helpful']
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        corePrinciples: principles
      })
      expect(prompt).toContain('<core_principles>')
      expect(prompt).toContain('<principle>Be accurate</principle>')
      expect(prompt).toContain('<principle>Be helpful</principle>')
    })

    it('should exclude core principles when omitted', () => {
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        role: 'assistant'
      })
      expect(prompt).not.toContain('<core_principles>')
    })

    it('should exclude core principles when empty array', () => {
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        corePrinciples: []
      })
      expect(prompt).not.toContain('<core_principles>')
    })
  })

  describe('communication field', () => {
    it('should include communication when provided', () => {
      const comm = '<guideline>Be concise</guideline>'
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        communication: comm
      })
      expect(prompt).toContain('<communication>')
      expect(prompt).toContain(comm)
    })

    it('should exclude communication when omitted', () => {
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        role: 'assistant'
      })
      expect(prompt).not.toContain('<communication>')
    })
  })

  describe('execution field', () => {
    it('should include execution when provided', () => {
      const exec = '<step>Plan first</step>'
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        execution: exec
      })
      expect(prompt).toContain('<execution>')
      expect(prompt).toContain(exec)
    })

    it('should exclude execution when omitted', () => {
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        role: 'assistant'
      })
      expect(prompt).not.toContain('<execution>')
    })
  })

  describe('additionalInstructions field', () => {
    it('should include additional instructions when provided', () => {
      const additional = '<special>Custom behavior</special>'
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        additionalInstructions: additional
      })
      expect(prompt).toContain(additional)
    })

    it('should exclude when omitted', () => {
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        role: 'assistant'
      })
      expect(prompt).not.toContain('<special>')
    })
  })

  describe('rulebook field', () => {
    it('should use provided rulebook', () => {
      const customRules = [{ content: 'Custom rule' }]
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        rulebook: customRules
      })
      expect(prompt).toContain('<agent_rulebook>')
      expect(prompt).toContain('Custom rule')
      expect(prompt).not.toContain('Always be polite')
    })

    it('should exclude when omitted', () => {
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        role: 'assistant'
      })
      expect(prompt).not.toContain('<agent_rulebook>')
    })
  })

  describe('userContext field', () => {
    it('should use provided context', () => {
      const customContext = [{ id: 'c1', type: 'custom', name: 'Custom' }]
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        userContext: customContext
      })
      expect(prompt).toContain('<user_context>')
      expect(prompt).toContain('Custom')
      expect(prompt).not.toContain('My Project')
    })

    it('should exclude when omitted', () => {
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        role: 'assistant'
      })
      expect(prompt).not.toContain('<user_context>')
    })
  })

  describe('tools field', () => {
    it('should use provided tools', () => {
      const customTools = [{ type: 'custom', name: 'CustomTool' }]
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        tools: customTools
      })
      expect(prompt).toContain('<available_tools>')
      expect(prompt).toContain('CustomTool')
      expect(prompt).not.toContain('SearchWeb')
    })

    it('should exclude when omitted', () => {
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        role: 'assistant'
      })
      expect(prompt).not.toContain('<available_tools>')
    })
  })

  describe('dateTime field', () => {
    it('should include current date/time when true', () => {
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        dateTime: true
      })
      expect(prompt).toContain('<date_time>')
      expect(prompt).toMatch(/<date_time>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should include custom date/time when string', () => {
      const customDate = '2024-01-15T10:30:00Z'
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        dateTime: customDate
      })
      expect(prompt).toContain(`<date_time>${customDate}</date_time>`)
    })

    it('should exclude when omitted', () => {
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        role: 'assistant'
      })
      expect(prompt).not.toContain('<date_time>')
    })
  })

  describe('timezone field', () => {
    it('should include current timezone when true', () => {
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        timezone: true
      })
      expect(prompt).toContain('<timezone>')
    })

    it('should include custom timezone when string', () => {
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        timezone: 'America/New_York'
      })
      expect(prompt).toContain('<timezone>America/New_York</timezone>')
    })

    it('should exclude when omitted', () => {
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        role: 'assistant'
      })
      expect(prompt).not.toContain('<timezone>')
    })
  })

  describe('Complex combinations', () => {
    it('should build full custom prompt', () => {
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        role: 'content_generator',
        purpose: 'Create blog posts',
        corePrinciples: ['Be creative', 'Stay on topic'],
        communication: '<guideline>Use markdown</guideline>',
        execution: '<step>Draft first</step>',
        additionalInstructions: '<note>Check grammar</note>',
        dateTime: '2024-01-01T00:00:00Z',
        timezone: 'UTC'
      })

      expect(prompt).toContain('<role>content_generator</role>')
      expect(prompt).toContain('<purpose>Create blog posts</purpose>')
      expect(prompt).toContain('<principle>Be creative</principle>')
      expect(prompt).toContain('<guideline>Use markdown</guideline>')
      expect(prompt).toContain('<step>Draft first</step>')
      expect(prompt).toContain('<note>Check grammar</note>')
      expect(prompt).toContain('<date_time>2024-01-01T00:00:00Z</date_time>')
      expect(prompt).toContain('<timezone>UTC</timezone>')
      
      // Should not include omitted fields
      expect(prompt).not.toContain('<agent_rulebook>')
      expect(prompt).not.toContain('<user_context>')
      expect(prompt).not.toContain('<available_tools>')
    })

    it('should work with minimal config', () => {
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        role: 'minimal_agent'
      })

      expect(prompt).toContain('<role>minimal_agent</role>')
      expect(prompt.trim()).toBe('<role>minimal_agent</role>')
    })

    it('should work with empty config (exclude everything)', () => {
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {})
      expect(prompt.trim()).toBe('')
    })

    it('should support all instructions components together', () => {
      const prompt = buildAgentSystemPrompt(mockAgent, mockRulebook, {
        role: 'assistant',
        purpose: 'Help users',
        corePrinciples: ['Principle 1', 'Principle 2'],
        communication: '<guideline>Communicate well</guideline>',
        execution: '<step>Execute properly</step>'
      })

      expect(prompt).toContain('<role>assistant</role>')
      expect(prompt).toContain('<purpose>Help users</purpose>')
      expect(prompt).toContain('<core_principles>')
      expect(prompt).toContain('<communication>')
      expect(prompt).toContain('<execution>')
    })
  })
})
