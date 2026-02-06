import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SearchWeb, executeSearchWeb } from './SearchWeb.tool'
import type { ExecutionContext, ToolResult } from '../types'

describe('SearchWeb Tool', () => {
  let mockFetch: ReturnType<typeof vi.fn>
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    // Store original fetch
    originalFetch = global.fetch
    
    // Create mock fetch
    mockFetch = vi.fn()
    global.fetch = mockFetch as any
  })

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  describe('Tool Definition', () => {
    it('should have correct structure', () => {
      expect(SearchWeb.type).toBe('function')
      expect(SearchWeb.name).toBe('SearchWeb')
      expect(SearchWeb.description).toContain('Perplexity API')
      expect(SearchWeb.strict).toBe(false)
    })

    it('should have correct parameters schema', () => {
      expect(SearchWeb.parameters).toMatchObject({
        type: 'object',
        additionalProperties: false,
        properties: {
          query: {
            type: 'string',
            description: expect.any(String)
          },
          language: {
            type: 'string',
            description: expect.any(String),
            enum: ['en', 'es', 'fr']
          }
        },
        required: ['query', 'language']
      })
    })

    it('should have executor function', () => {
      expect(SearchWeb.executor).toBe(executeSearchWeb)
      expect(typeof SearchWeb.executor).toBe('function')
    })
  })

  describe('executeSearchWeb', () => {
    it('should successfully search web with valid response', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Here are the search results about AI...'
            }
          }
        ],
        search_results: [
          {
            title: 'AI Research Paper',
            url: 'https://example.com/ai-paper',
            snippet: 'Latest advances in AI technology...'
          },
          {
            title: 'AI Blog Post',
            url: 'https://example.com/blog',
            snippet: 'Understanding AI fundamentals...',
            published_date: '2024-01-15',
            author: 'John Doe'
          }
        ],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 200
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      })

      const context: ExecutionContext = {
        services: {
          perplexity: {
            apiKey: 'test-api-key'
          }
        }
      }

      const result = await executeSearchWeb(
        { query: 'AI technology', language: 'en' },
        context
      )

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      
      const output = JSON.parse(result.output)
      expect(output.content).toBe('Here are the search results about AI...')
      expect(output.search_results).toHaveLength(2)
      expect(output.search_results[0]).toMatchObject({
        title: 'AI Research Paper',
        url: 'https://example.com/ai-paper'
      })

      expect(result.metadata).toMatchObject({
        resultsCount: 2
      })

      // Verify fetch was called correctly
      expect(mockFetch).toHaveBeenCalledOnce()
      const fetchCall = mockFetch.mock.calls[0]
      expect(fetchCall[0]).toBe('https://api.perplexity.ai/chat/completions')
      
      const fetchOptions = fetchCall[1]
      expect(fetchOptions.method).toBe('POST')
      expect(fetchOptions.headers['Authorization']).toBe('Bearer test-api-key')
      expect(fetchOptions.headers['Content-Type']).toBe('application/json')
      
      const body = JSON.parse(fetchOptions.body)
      expect(body.model).toBe('sonar')
      expect(body.messages[0].content).toContain('AI technology')
      expect(body.messages[0].content).toContain('en')
    })

    it('should track usage when callback is provided', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Results' } }],
        search_results: [],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 250
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const trackUsage = vi.fn().mockResolvedValue(undefined)

      const context: ExecutionContext = {
        services: {
          perplexity: { apiKey: 'test-key' }
        },
        trackUsage
      }

      const result = await executeSearchWeb(
        { query: 'test', language: 'en' },
        context
      )

      expect(result.success).toBe(true)
      expect(trackUsage).toHaveBeenCalledOnce()
      expect(trackUsage).toHaveBeenCalledWith({
        model: 'sonar',
        input_tokens: 100,
        output_tokens: 250,
        function_called: 'SearchWeb',
        trigger: 'web_search'
      })
    })

    it('should not track usage when callback is not provided', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Results' } }],
        search_results: [],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 250
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const context: ExecutionContext = {
        services: {
          perplexity: { apiKey: 'test-key' }
        }
        // No trackUsage callback
      }

      const result = await executeSearchWeb(
        { query: 'test', language: 'en' },
        context
      )

      expect(result.success).toBe(true)
      // Should not throw error
    })

    it('should handle missing API key', async () => {
      const context: ExecutionContext = {
        services: {}
      }

      const result = await executeSearchWeb(
        { query: 'test query', language: 'en' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.output).toBe('')
      expect(result.error).toBe('Perplexity API key not configured. Provide it via context.services.perplexity.apiKey or PERPLEXITY_API_KEY environment variable')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should handle context without services', async () => {
      const context: ExecutionContext = {}

      const result = await executeSearchWeb(
        { query: 'test query', language: 'en' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Perplexity API key not configured. Provide it via context.services.perplexity.apiKey or PERPLEXITY_API_KEY environment variable')
    })

    it('should handle API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })

      const context: ExecutionContext = {
        services: {
          perplexity: { apiKey: 'invalid-key' }
        }
      }

      const result = await executeSearchWeb(
        { query: 'test', language: 'en' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.output).toBe('')
      expect(result.error).toBe('Perplexity API error: 401 Unauthorized')
    })

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network connection failed'))

      const context: ExecutionContext = {
        services: {
          perplexity: { apiKey: 'test-key' }
        }
      }

      const result = await executeSearchWeb(
        { query: 'test', language: 'en' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.output).toBe('')
      expect(result.error).toBe('Network connection failed')
    })

    it('should use custom API URL when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Results' } }],
          search_results: []
        })
      })

      const context: ExecutionContext = {
        services: {
          perplexity: {
            apiKey: 'test-key',
            apiUrl: 'https://custom-api.example.com/chat'
          }
        }
      }

      await executeSearchWeb({ query: 'test', language: 'en' }, context)

      expect(mockFetch).toHaveBeenCalledOnce()
      expect(mockFetch.mock.calls[0][0]).toBe('https://custom-api.example.com/chat')
    })

    it('should handle empty response gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [],
          search_results: []
        })
      })

      const context: ExecutionContext = {
        services: {
          perplexity: { apiKey: 'test-key' }
        }
      }

      const result = await executeSearchWeb(
        { query: 'test', language: 'en' },
        context
      )

      expect(result.success).toBe(true)
      const output = JSON.parse(result.output)
      expect(output.content).toBe('No results found')
      expect(output.search_results).toEqual([])
    })

    it('should support different languages', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Résultats en français' } }],
        search_results: []
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const context: ExecutionContext = {
        services: {
          perplexity: { apiKey: 'test-key' }
        }
      }

      const result = await executeSearchWeb(
        { query: 'technologie IA', language: 'fr' },
        context
      )

      expect(result.success).toBe(true)
      
      const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(fetchBody.messages[0].content).toContain('fr')
      expect(fetchBody.messages[0].content).toContain('technologie IA')
    })

    it('should filter out YouTube domains', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Results' } }],
          search_results: []
        })
      })

      const context: ExecutionContext = {
        services: {
          perplexity: { apiKey: 'test-key' }
        }
      }

      await executeSearchWeb({ query: 'test', language: 'en' }, context)

      const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(fetchBody.search_domain_filter).toEqual(['-youtube.com'])
    })
  })
})
