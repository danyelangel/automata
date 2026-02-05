import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SearchImage, executeSearchImage } from './SearchImage.tool'
import type { ExecutionContext, ToolResult } from '../types'

describe('SearchImage Tool', () => {
  let mockFirestoreQuery: ReturnType<typeof vi.fn>
  let mockCallStructuredLLM: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFirestoreQuery = vi.fn().mockResolvedValue([
      {
        id: 'img1',
        url: 'https://example.com/img1.jpg',
        prompt: 'A beautiful sunset',
        createdAt: new Date('2024-01-01')
      },
      {
        id: 'img2',
        url: 'https://example.com/img2.jpg',
        prompt: 'Mountain landscape',
        createdAt: new Date('2024-01-02')
      },
      {
        id: 'img3',
        url: 'https://example.com/img3.jpg',
        prompt: 'Ocean waves',
        createdAt: new Date('2024-01-03')
      }
    ])

    mockCallStructuredLLM = vi.fn().mockResolvedValue({
      data: {
        images: [
          {
            id: 'img1',
            url: 'https://example.com/img1.jpg',
            prompt: 'A beautiful sunset',
            relevanceScore: 9
          },
          {
            id: 'img2',
            url: 'https://example.com/img2.jpg',
            prompt: 'Mountain landscape',
            relevanceScore: 7
          }
        ]
      },
      usage: {
        input_tokens: 100,
        output_tokens: 50
      }
    })
  })

  describe('Tool Definition', () => {
    it('should have correct structure', () => {
      expect(SearchImage.type).toBe('function')
      expect(SearchImage.name).toBe('SearchImage')
      expect(SearchImage.description).toContain('intelligent filtering')
      expect(SearchImage.strict).toBe(false)
    })

    it('should have correct parameters schema', () => {
      expect(SearchImage.parameters).toMatchObject({
        type: 'object',
        additionalProperties: false,
        properties: {
          prompt: {
            type: 'string',
            description: expect.any(String)
          },
          limit: {
            type: 'number',
            description: expect.any(String),
            minimum: 1,
            maximum: 100
          }
        },
        required: []
      })
    })

    it('should have executor function', () => {
      expect(SearchImage.executor).toBe(executeSearchImage)
      expect(typeof SearchImage.executor).toBe('function')
    })
  })

  describe('executeSearchImage', () => {
    it('should return all images when no prompt provided', async () => {
      const context: ExecutionContext = {
        agent: {
          projectId: 'test-project-123'
        },
        services: {
          firebase: {
            firestore: {
              query: mockFirestoreQuery
            }
          }
        }
      }

      const result = await executeSearchImage({}, context)

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()

      const output = JSON.parse(result.output)
      expect(output.images).toHaveLength(3)
      expect(output.totalFound).toBe(3)
      expect(output.searchQuery).toBeUndefined()

      expect(mockFirestoreQuery).toHaveBeenCalledOnce()
      expect(mockFirestoreQuery).toHaveBeenCalledWith('images', {
        projectId: 'test-project-123'
      })

      expect(mockCallStructuredLLM).not.toHaveBeenCalled()

      expect(result.metadata).toMatchObject({
        totalFound: 3,
        returnedCount: 3
      })
    })

    it('should respect limit when returning all images', async () => {
      const context: ExecutionContext = {
        agent: {
          projectId: 'test-project-123'
        },
        services: {
          firebase: {
            firestore: {
              query: mockFirestoreQuery
            }
          }
        }
      }

      const result = await executeSearchImage({ limit: 2 }, context)

      expect(result.success).toBe(true)
      const output = JSON.parse(result.output)
      expect(output.images).toHaveLength(2)
      expect(output.totalFound).toBe(3)
    })

    it('should perform semantic search when prompt is provided', async () => {
      const context: ExecutionContext = {
        agent: {
          projectId: 'test-project-123'
        },
        services: {
          firebase: {
            firestore: {
              query: mockFirestoreQuery
            }
          },
          openai: {
            callStructuredLLM: mockCallStructuredLLM
          }
        }
      }

      const result = await executeSearchImage(
        { prompt: 'sunset', limit: 10 },
        context
      )

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()

      const output = JSON.parse(result.output)
      expect(output.images).toHaveLength(2)
      expect(output.images[0].relevanceScore).toBe(9)
      expect(output.images[1].relevanceScore).toBe(7)

      expect(mockFirestoreQuery).toHaveBeenCalledOnce()
      expect(mockCallStructuredLLM).toHaveBeenCalledOnce()

      const llmCall = mockCallStructuredLLM.mock.calls[0][0]
      expect(llmCall.systemPrompt).toContain('expert at finding and ranking images')
      expect(llmCall.userPrompt).toContain('sunset')
      expect(llmCall.userPrompt).toContain('available_images')
      expect(llmCall.trigger).toBe('image_search')

      expect(result.metadata).toMatchObject({
        searchQuery: 'sunset',
        returnedCount: 2,
        totalAvailable: 3
      })
    })

    it('should apply limit to search results', async () => {
      mockCallStructuredLLM.mockResolvedValueOnce({
        data: {
          images: [
            { id: 'img1', url: 'url1', prompt: 'prompt1', relevanceScore: 9 },
            { id: 'img2', url: 'url2', prompt: 'prompt2', relevanceScore: 8 },
            { id: 'img3', url: 'url3', prompt: 'prompt3', relevanceScore: 7 },
            { id: 'img4', url: 'url4', prompt: 'prompt4', relevanceScore: 6 }
          ]
        },
        usage: { input_tokens: 100, output_tokens: 50 }
      })

      const context: ExecutionContext = {
        agent: {
          projectId: 'test-project-123'
        },
        services: {
          firebase: {
            firestore: {
              query: mockFirestoreQuery
            }
          },
          openai: {
            callStructuredLLM: mockCallStructuredLLM
          }
        }
      }

      const result = await executeSearchImage(
        { prompt: 'test', limit: 2 },
        context
      )

      expect(result.success).toBe(true)
      const output = JSON.parse(result.output)
      expect(output.images).toHaveLength(2)
    })

    it('should track usage when callback is provided', async () => {
      const trackUsage = vi.fn().mockResolvedValue(undefined)

      const context: ExecutionContext = {
        agent: {
          projectId: 'test-project-123'
        },
        services: {
          firebase: {
            firestore: {
              query: mockFirestoreQuery
            }
          },
          openai: {
            callStructuredLLM: mockCallStructuredLLM
          }
        },
        trackUsage
      }

      const result = await executeSearchImage(
        { prompt: 'test' },
        context
      )

      expect(result.success).toBe(true)
      expect(trackUsage).toHaveBeenCalledOnce()
      expect(trackUsage).toHaveBeenCalledWith({
        model: 'gpt-5-mini',
        input_tokens: 100,
        output_tokens: 50,
        function_called: 'SearchImage',
        trigger: 'image_search'
      })
    })

    it('should handle missing projectId', async () => {
      const context: ExecutionContext = {
        services: {
          firebase: {
            firestore: {
              query: mockFirestoreQuery
            }
          }
        }
      }

      const result = await executeSearchImage({}, context)

      expect(result.success).toBe(false)
      expect(result.error).toBe('projectId is required in context.agent.projectId')
    })

    it('should handle missing Firebase service', async () => {
      const context: ExecutionContext = {
        agent: {
          projectId: 'test-project-123'
        }
      }

      const result = await executeSearchImage({}, context)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Firebase service not configured. Provide context.services.firebase.firestore.query')
    })

    it('should handle missing OpenAI service when prompt is provided', async () => {
      const context: ExecutionContext = {
        agent: {
          projectId: 'test-project-123'
        },
        services: {
          firebase: {
            firestore: {
              query: mockFirestoreQuery
            }
          }
        }
      }

      const result = await executeSearchImage(
        { prompt: 'test' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('OpenAI service not configured. Provide context.services.openai.callStructuredLLM for semantic search')
    })

    it('should handle firestore query error', async () => {
      mockFirestoreQuery.mockRejectedValueOnce(new Error('Firestore query failed'))

      const context: ExecutionContext = {
        agent: {
          projectId: 'test-project-123'
        },
        services: {
          firebase: {
            firestore: {
              query: mockFirestoreQuery
            }
          }
        }
      }

      const result = await executeSearchImage({}, context)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Firestore query failed')
    })

    it('should handle LLM search error', async () => {
      mockCallStructuredLLM.mockRejectedValueOnce(new Error('LLM search failed'))

      const context: ExecutionContext = {
        agent: {
          projectId: 'test-project-123'
        },
        services: {
          firebase: {
            firestore: {
              query: mockFirestoreQuery
            }
          },
          openai: {
            callStructuredLLM: mockCallStructuredLLM
          }
        }
      }

      const result = await executeSearchImage(
        { prompt: 'test' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('LLM search failed')
    })

    it('should enforce limit maximum of 100', async () => {
      const context: ExecutionContext = {
        agent: {
          projectId: 'test-project-123'
        },
        services: {
          firebase: {
            firestore: {
              query: mockFirestoreQuery
            }
          }
        }
      }

      const result = await executeSearchImage({ limit: 200 }, context)

      expect(result.success).toBe(true)
      const output = JSON.parse(result.output)
      expect(output.images.length).toBeLessThanOrEqual(100)
    })

    it('should enforce limit minimum of 1', async () => {
      const context: ExecutionContext = {
        agent: {
          projectId: 'test-project-123'
        },
        services: {
          firebase: {
            firestore: {
              query: mockFirestoreQuery
            }
          }
        }
      }

      const result = await executeSearchImage({ limit: 0 }, context)

      expect(result.success).toBe(true)
      const output = JSON.parse(result.output)
      expect(output.images.length).toBeGreaterThanOrEqual(1)
    })
  })
})
