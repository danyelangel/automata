import type { ToolDefinition, ExecutionContext, ToolResult } from '../types'

const GENERATE_IMAGE_DESCRIPTION = `
<tool_description>
  <summary>Generates an image using OpenAI DALL-E based on the provided prompt and uploads it to storage. The image URL and prompt are stored in the images collection.</summary>
  <usage>Use to generate images for content, articles, or any visual needs. The generated image will be uploaded to storage and its metadata stored in the database.</usage>
  <output>Returns the image URL, prompt, and size information.</output>
</tool_description>
`

export async function executeGenerateImage(
  args: Record<string, unknown>,
  context: ExecutionContext
): Promise<ToolResult> {
  const prompt = args.prompt as string
  const size = (args.size as string) || '1024x1024'
  const transparentBackground = (args.transparentBackground as boolean) || false
  const format = (args.format as 'png' | 'webp' | 'jpeg') || 'webp'

  try {
    if (!prompt) {
      return {
        success: false,
        output: '',
        error: 'prompt is required'
      }
    }

    // Check for OpenAI service
    if (!context.services?.openai?.generateImage) {
      return {
        success: false,
        output: '',
        error: 'OpenAI service not configured. Provide context.services.openai.generateImage'
      }
    }

    // Check for Firebase service
    if (!context.services?.firebase?.storage?.upload || !context.services?.firebase?.firestore?.add) {
      return {
        success: false,
        output: '',
        error: 'Firebase service not configured. Provide context.services.firebase.storage.upload and firestore.add'
      }
    }

    console.info('GenerateImage: Generating image', { prompt, size, format, transparentBackground })

    // Generate image using OpenAI
    const { imageData, format: imageFormat } = await context.services.openai.generateImage({
      prompt,
      size,
      transparentBackground,
      format
    })

    console.info('GenerateImage: Image generated, uploading to storage')

    // Upload to Firebase Storage
    const filename = `images/${Date.now()}.${imageFormat}`
    const imageBuffer = Buffer.from(imageData, 'base64')
    const downloadURL = await context.services.firebase.storage.upload(
      imageBuffer,
      filename,
      `image/${imageFormat}`
    )

    console.info('GenerateImage: Image uploaded, storing metadata')

    // Store metadata in Firestore
    const imageId = await context.services.firebase.firestore.add('images', {
      url: downloadURL,
      prompt,
      projectId: context.agent?.projectId,
      createdAt: new Date()
    })

    // Track usage if callback is provided
    if (context.trackUsage) {
      await context.trackUsage({
        model: 'gpt-4.1',
        input_tokens: 0,
        output_tokens: 0,
        function_called: 'GenerateImage',
        trigger: 'image_generation'
      })
    }

    console.info('GenerateImage: Completed successfully', { imageId, downloadURL })

    return {
      success: true,
      output: JSON.stringify({
        url: downloadURL,
        prompt,
        size,
        format: imageFormat,
        id: imageId
      }),
      metadata: {
        imageId,
        format: imageFormat,
        size
      }
    }
  } catch (error) {
    console.error('GenerateImage: Error executing tool:', error)
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Failed to generate image'
    }
  }
}

export const GenerateImage: ToolDefinition = {
  type: 'function',
  name: 'GenerateImage',
  description: GENERATE_IMAGE_DESCRIPTION,
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      prompt: {
        type: 'string',
        description: 'The prompt describing the image to generate'
      },
      size: {
        enum: ['1024x1024', '1024x1536', '1536x1024', 'auto'],
        type: 'string',
        description: 'The size of the image to generate',
        default: 'auto'
      },
      transparentBackground: {
        type: 'boolean',
        description: 'Whether the image should have a transparent background',
        default: false
      },
      format: {
        enum: ['png', 'webp', 'jpeg'],
        type: 'string',
        description: 'The format of the image to generate',
        default: 'webp'
      }
    },
    required: ['prompt']
  },
  strict: false,
  executor: executeGenerateImage
}
