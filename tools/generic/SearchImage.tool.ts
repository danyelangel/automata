import type { ToolDefinition, ExecutionContext, ToolResult } from '../types'

const SEARCH_IMAGE_DESCRIPTION = `
<tool_description>
  <summary>Searches and retrieves images with intelligent filtering using AI. Can be used both as a search tool and as a list function.</summary>
  <usage>
    When used as a list function: If no parameters are provided, all images for the project will be returned.
    When used as a search function: Uses AI to intelligently match images based on semantic similarity to the provided prompt.
    Each image returned includes a url field that can be used for embedding in content.
    For embedding images in content, use the format &lt;img src="\${image.url}" alt="\${image.prompt}" /&gt; in your HTML content.
  </usage>
  <output>Returns an array of images with their URLs, prompts, and relevance scores (when searching).</output>
</tool_description>
`

const SEARCH_IMAGE_INSTRUCTIONS = `
<role>You are an expert at finding and ranking images based on search queries.</role>
<task>Given a list of images with their prompts and a search query, return the most relevant images ordered by relevance.</task>
<output_requirements>
  <field name="relevanceScore">A score from 0-10 indicating how well the image matches the search query</field>
  <field name="reason">A brief explanation of why this image is relevant</field>
</output_requirements>
<considerations>
  <item>Semantic similarity between the search query and image prompt</item>
  <item>Visual concepts and themes</item>
  <item>Context and meaning</item>
  <item>Partial matches and related concepts</item>
</considerations>
<constraints>
  <constraint>Return only images with relevanceScore &gt;= 3 to ensure quality results.</constraint>
</constraints>
`

// Schema for image search results
const ImageSearchResultSchema = {
  type: 'object',
  properties: {
    images: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          url: { type: 'string' },
          prompt: { type: 'string' },
          relevanceScore: { type: 'number', minimum: 0, maximum: 10 }
        },
        required: ['id', 'url', 'prompt', 'relevanceScore']
      }
    }
  },
  required: ['images']
}

export async function executeSearchImage(
  args: Record<string, unknown>,
  context: ExecutionContext
): Promise<ToolResult> {
  const prompt = args.prompt as string | undefined
  const limit = Math.min(Math.max((args.limit as number) || 50, 1), 100)

  try {
    // Check for Firebase service
    if (!context.services?.firebase?.firestore?.query) {
      return {
        success: false,
        output: '',
        error: 'Firebase service not configured. Provide context.services.firebase.firestore.query'
      }
    }

    if (!context.agent?.projectId) {
      return {
        success: false,
        output: '',
        error: 'projectId is required in context.agent.projectId'
      }
    }

    console.info('SearchImage: Searching images', { prompt, limit, projectId: context.agent.projectId })

    // Query all images for the project
    const allImages = await context.services.firebase.firestore.query('images', {
      projectId: context.agent.projectId
    })

    console.info('SearchImage: Retrieved images from database', { totalImages: allImages.length })

    // If no prompt provided, return all images (up to limit)
    if (!prompt) {
      const limitedImages = allImages.slice(0, limit)

      console.info('SearchImage: Returning all images (no search prompt)', {
        returnedCount: limitedImages.length,
        totalAvailable: allImages.length
      })

      return {
        success: true,
        output: JSON.stringify({
          images: limitedImages,
          totalFound: allImages.length,
          searchQuery: undefined
        }),
        metadata: {
          totalFound: allImages.length,
          returnedCount: limitedImages.length
        }
      }
    }

    // Check for OpenAI service for semantic search
    if (!context.services?.openai?.callStructuredLLM) {
      return {
        success: false,
        output: '',
        error: 'OpenAI service not configured. Provide context.services.openai.callStructuredLLM for semantic search'
      }
    }

    // Use LLM to search and rank images
    const searchMessage = JSON.stringify({
      search_query: prompt,
      available_images: allImages.map((img: any) => ({
        id: img.id || img.url,
        prompt: img.prompt || 'No prompt'
      }))
    }, null, 2)

    const llmResult = await context.services.openai.callStructuredLLM({
      model: 'gpt-5-mini',
      systemPrompt: SEARCH_IMAGE_INSTRUCTIONS,
      userPrompt: searchMessage,
      schema: ImageSearchResultSchema,
      trigger: 'image_search'
    })

    // Apply limit to LLM results
    const limitedResults = {
      ...llmResult.data,
      images: llmResult.data.images.slice(0, limit)
    }

    // Track usage if callback is provided
    if (context.trackUsage && llmResult.usage) {
      await context.trackUsage({
        model: 'gpt-5-mini',
        input_tokens: llmResult.usage.input_tokens,
        output_tokens: llmResult.usage.output_tokens,
        function_called: 'SearchImage',
        trigger: 'image_search'
      })
    }

    console.info('SearchImage: LLM image search completed', {
      searchQuery: prompt,
      returnedCount: limitedResults.images.length
    })

    return {
      success: true,
      output: JSON.stringify(limitedResults),
      metadata: {
        searchQuery: prompt,
        returnedCount: limitedResults.images.length,
        totalAvailable: allImages.length
      }
    }
  } catch (error) {
    console.error('SearchImage: Error executing tool:', error)
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Failed to search images'
    }
  }
}

export const SearchImage: ToolDefinition = {
  type: 'function',
  name: 'SearchImage',
  description: SEARCH_IMAGE_DESCRIPTION,
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      prompt: {
        type: 'string',
        description: 'Optional prompt text to filter images. The AI will intelligently match images based on semantic similarity.'
      },
      limit: {
        type: 'number',
        description: 'Optional limit on the number of images to return (default: 50, max: 100).',
        minimum: 1,
        maximum: 100
      }
    },
    required: []
  },
  strict: false,
  executor: executeSearchImage
}
