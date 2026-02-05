import type { ToolDefinition, ExecutionContext, ToolResult } from '../types'

const SEARCH_WEB_DESCRIPTION = `
<tool_description>
  <summary>Searches the web for information using the Perplexity API.</summary>
  <usage>Use to find web data for a specific brief or article. Do NOT use this tool if the user asks for a specific site or URL. Only use for general questions or when you need to get multiple sources about a topic.</usage>
  <output>Returns a list of potential sources including quotes, references, and other relevant information.</output>
</tool_description>
`

interface PerplexitySearchResult {
  title: string
  url: string
  snippet: string
  published_date?: string
  author?: string
}

interface PerplexityResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  search_results?: PerplexitySearchResult[]
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
  }
}

function buildPerplexityPrompt(query: string, language: string): string {
  return `
<web_search>
  <query>${query}</query>
  <language>${language}</language>
</web_search>`
}

export async function executeSearchWeb(
  args: Record<string, unknown>,
  context: ExecutionContext
): Promise<ToolResult> {
  const query = args.query as string
  const language = args.language as string
  
  try {
    // Extract Perplexity API configuration (from context or environment)
    const apiKey = context.services?.perplexity?.apiKey || process.env.PERPLEXITY_API_KEY
    if (!apiKey) {
      return {
        success: false,
        output: '',
        error: 'Perplexity API key not configured. Provide it via context.services.perplexity.apiKey or PERPLEXITY_API_KEY environment variable'
      }
    }

    const apiUrl = context.services?.perplexity?.apiUrl || 'https://api.perplexity.ai/chat/completions'
    const model = 'sonar'

    console.info('SearchWeb: Executing with query:', query)

    // Build the prompt and make the API request
    const prompt = buildPerplexityPrompt(query, language)
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        search_domain_filter: ['-youtube.com'],
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.2
      })
    })

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`)
    }

    const result: PerplexityResponse = await response.json()

    // Track usage if callback is provided
    if (context.trackUsage && result.usage) {
      await context.trackUsage({
        model,
        input_tokens: result.usage.prompt_tokens || 0,
        output_tokens: result.usage.completion_tokens || 0,
        function_called: 'SearchWeb',
        trigger: 'web_search'
      })
    }

    const content = result.choices?.[0]?.message?.content || 'No results found'
    const searchResults = result.search_results || []

    console.info('SearchWeb: Completed successfully', {
      contentLength: content.length,
      resultsCount: searchResults.length
    })

    return {
      success: true,
      output: JSON.stringify({
        content,
        search_results: searchResults
      }),
      metadata: {
        resultsCount: searchResults.length
      }
    }
  } catch (error) {
    console.error('SearchWeb: Error executing tool:', error)
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Failed to search web'
    }
  }
}

export const SearchWeb: ToolDefinition = {
  type: 'function',
  name: 'SearchWeb',
  description: SEARCH_WEB_DESCRIPTION,
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      query: {
        type: 'string',
        description: 'The query to search for web information.'
      },
      language: {
        type: 'string',
        description: 'The language of the search query.',
        enum: ['en', 'es', 'fr']
      }
    },
    required: ['query', 'language']
  },
  strict: false,
  executor: executeSearchWeb
}
