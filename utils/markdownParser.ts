/**
 * Parses markdown image links and converts them to HTML img tags
 * Supports the format: ![alt text](url)
 */
export function parseMarkdownImages(text: string): string {
  // Regex to match markdown image syntax: ![alt text](url)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g

  return text.replace(imageRegex, (match, altText, url) => {
    // Clean up the alt text and URL
    const cleanAlt = altText.trim()
    const cleanUrl = url.trim()

    // Return HTML img tag
    return `<a href="${cleanUrl}" target="_blank" class="inline text-blue-500 hover:text-blue-600">${cleanAlt}</a>`
  })
}

/**
 * Parses markdown content and converts it to HTML
 * Currently supports:
 * - Image links: ![alt text](url)
 */
export function parseMarkdown(text: string): string {
  if (!text) return text

  // Parse images first
  const parsedText = parseMarkdownImages(text)

  return parsedText
}
