import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GenerateImage, executeGenerateImage } from './GenerateImage.tool'
import type { ExecutionContext, ToolResult } from '../types'

describe('GenerateImage Tool', () => {
  let mockGenerateImage: ReturnType<typeof vi.fn>
  let mockStorageUpload: ReturnType<typeof vi.fn>
  let mockFirestoreAdd: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockGenerateImage = vi.fn().mockResolvedValue({
      imageData: 'base64encodedimagedata',
      format: 'webp'
    })

    mockStorageUpload = vi.fn().mockResolvedValue('https://storage.example.com/images/123.webp')

    mockFirestoreAdd = vi.fn().mockResolvedValue('image-doc-id-123')
  })

  describe('Tool Definition', () => {
    it('should have correct structure', () => {
      expect(GenerateImage.type).toBe('function')
      expect(GenerateImage.name).toBe('GenerateImage')
      expect(GenerateImage.description).toContain('DALL-E')
      expect(GenerateImage.strict).toBe(false)
    })

    it('should have correct parameters schema', () => {
      expect(GenerateImage.parameters).toMatchObject({
        type: 'object',
        additionalProperties: false,
        properties: {
          prompt: {
            type: 'string',
            description: expect.any(String)
          },
          size: {
            enum: ['1024x1024', '1024x1536', '1536x1024', 'auto'],
            type: 'string',
            description: expect.any(String)
          },
          transparentBackground: {
            type: 'boolean',
            description: expect.any(String)
          },
          format: {
            enum: ['png', 'webp', 'jpeg'],
            type: 'string',
            description: expect.any(String)
          }
        },
        required: ['prompt']
      })
    })

    it('should have executor function', () => {
      expect(GenerateImage.executor).toBe(executeGenerateImage)
      expect(typeof GenerateImage.executor).toBe('function')
    })
  })

  describe('executeGenerateImage', () => {
    it('should successfully generate and upload image', async () => {
      const context: ExecutionContext = {
        agent: {
          projectId: 'test-project-123'
        },
        services: {
          openai: {
            generateImage: mockGenerateImage
          },
          firebase: {
            storage: {
              upload: mockStorageUpload
            },
            firestore: {
              add: mockFirestoreAdd
            }
          }
        }
      }

      const result = await executeGenerateImage(
        { prompt: 'A beautiful sunset over mountains' },
        context
      )

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()

      const output = JSON.parse(result.output)
      expect(output.url).toBe('https://storage.example.com/images/123.webp')
      expect(output.prompt).toBe('A beautiful sunset over mountains')
      expect(output.size).toBe('1024x1024')
      expect(output.format).toBe('webp')
      expect(output.id).toBe('image-doc-id-123')

      expect(mockGenerateImage).toHaveBeenCalledOnce()
      expect(mockGenerateImage).toHaveBeenCalledWith({
        prompt: 'A beautiful sunset over mountains',
        size: '1024x1024',
        transparentBackground: false,
        format: 'webp'
      })

      expect(mockStorageUpload).toHaveBeenCalledOnce()
      const uploadCall = mockStorageUpload.mock.calls[0]
      expect(uploadCall[1]).toMatch(/^images\/\d+\.webp$/)
      expect(uploadCall[2]).toBe('image/webp')

      expect(mockFirestoreAdd).toHaveBeenCalledOnce()
      expect(mockFirestoreAdd).toHaveBeenCalledWith('images', expect.objectContaining({
        url: 'https://storage.example.com/images/123.webp',
        prompt: 'A beautiful sunset over mountains',
        projectId: 'test-project-123'
      }))

      expect(result.metadata).toMatchObject({
        imageId: 'image-doc-id-123',
        format: 'webp',
        size: '1024x1024'
      })
    })

    it('should use custom size, format, and transparentBackground', async () => {
      const context: ExecutionContext = {
        agent: {
          projectId: 'test-project-123'
        },
        services: {
          openai: {
            generateImage: mockGenerateImage
          },
          firebase: {
            storage: {
              upload: mockStorageUpload
            },
            firestore: {
              add: mockFirestoreAdd
            }
          }
        }
      }

      const result = await executeGenerateImage(
        {
          prompt: 'Abstract art',
          size: '1536x1024',
          format: 'png',
          transparentBackground: true
        },
        context
      )

      expect(result.success).toBe(true)
      expect(mockGenerateImage).toHaveBeenCalledWith({
        prompt: 'Abstract art',
        size: '1536x1024',
        format: 'png',
        transparentBackground: true
      })
    })

    it('should track usage when callback is provided', async () => {
      const trackUsage = vi.fn().mockResolvedValue(undefined)

      const context: ExecutionContext = {
        agent: {
          projectId: 'test-project-123'
        },
        services: {
          openai: {
            generateImage: mockGenerateImage
          },
          firebase: {
            storage: {
              upload: mockStorageUpload
            },
            firestore: {
              add: mockFirestoreAdd
            }
          }
        },
        trackUsage
      }

      const result = await executeGenerateImage(
        { prompt: 'Test image' },
        context
      )

      expect(result.success).toBe(true)
      expect(trackUsage).toHaveBeenCalledOnce()
      expect(trackUsage).toHaveBeenCalledWith({
        model: 'gpt-4.1',
        input_tokens: 0,
        output_tokens: 0,
        function_called: 'GenerateImage',
        trigger: 'image_generation'
      })
    })

    it('should handle missing prompt', async () => {
      const context: ExecutionContext = {
        services: {
          openai: { generateImage: mockGenerateImage },
          firebase: {
            storage: { upload: mockStorageUpload },
            firestore: { add: mockFirestoreAdd }
          }
        }
      }

      const result = await executeGenerateImage({}, context)

      expect(result.success).toBe(false)
      expect(result.error).toBe('prompt is required')
      expect(mockGenerateImage).not.toHaveBeenCalled()
    })

    it('should handle missing OpenAI service', async () => {
      const context: ExecutionContext = {
        services: {
          firebase: {
            storage: { upload: mockStorageUpload },
            firestore: { add: mockFirestoreAdd }
          }
        }
      }

      const result = await executeGenerateImage(
        { prompt: 'Test' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('OpenAI service not configured. Provide context.services.openai.generateImage')
    })

    it('should handle missing Firebase service', async () => {
      const context: ExecutionContext = {
        services: {
          openai: {
            generateImage: mockGenerateImage
          }
        }
      }

      const result = await executeGenerateImage(
        { prompt: 'Test' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Firebase service not configured. Provide context.services.firebase.storage.upload and firestore.add')
    })

    it('should handle image generation error', async () => {
      mockGenerateImage.mockRejectedValueOnce(new Error('OpenAI API error'))

      const context: ExecutionContext = {
        agent: {
          projectId: 'test-project-123'
        },
        services: {
          openai: {
            generateImage: mockGenerateImage
          },
          firebase: {
            storage: {
              upload: mockStorageUpload
            },
            firestore: {
              add: mockFirestoreAdd
            }
          }
        }
      }

      const result = await executeGenerateImage(
        { prompt: 'Test' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('OpenAI API error')
    })

    it('should handle storage upload error', async () => {
      mockStorageUpload.mockRejectedValueOnce(new Error('Storage upload failed'))

      const context: ExecutionContext = {
        agent: {
          projectId: 'test-project-123'
        },
        services: {
          openai: {
            generateImage: mockGenerateImage
          },
          firebase: {
            storage: {
              upload: mockStorageUpload
            },
            firestore: {
              add: mockFirestoreAdd
            }
          }
        }
      }

      const result = await executeGenerateImage(
        { prompt: 'Test' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Storage upload failed')
    })

    it('should handle firestore add error', async () => {
      mockFirestoreAdd.mockRejectedValueOnce(new Error('Firestore error'))

      const context: ExecutionContext = {
        agent: {
          projectId: 'test-project-123'
        },
        services: {
          openai: {
            generateImage: mockGenerateImage
          },
          firebase: {
            storage: {
              upload: mockStorageUpload
            },
            firestore: {
              add: mockFirestoreAdd
            }
          }
        }
      }

      const result = await executeGenerateImage(
        { prompt: 'Test' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Firestore error')
    })
  })
})
