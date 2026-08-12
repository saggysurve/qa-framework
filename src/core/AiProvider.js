/**
 * AI PROVIDER — model-agnostic interface + Anthropic implementation
 * ------------------------------------------------------------------
 * Same pattern as UiExecutor: test/adapter code depends on the
 * AiProvider contract, never on a specific vendor's SDK directly.
 * Swapping to OpenAI or an internal model later means writing one
 * new class here — nothing else in the framework changes.
 *
 * Contract:
 *   suggestLocator(brokenLocator, pageContext): Promise<string | null>
 *     Given a locator that failed and some context about the page,
 *     returns a suggested CSS selector to try instead, or null if
 *     the AI has no confident suggestion.
 */

const REQUIRED_METHODS = ["suggestLocator"];

function assertImplementsAiProvider(provider) {
  const missing = REQUIRED_METHODS.filter((m) => typeof provider[m] !== "function");
  if (missing.length > 0) {
    throw new Error(
      `${provider.constructor.name} does not fully implement AiProvider. Missing: ${missing.join(", ")}`
    );
  }
}

// ---------------------------------------------------------------
// Concrete implementation: Anthropic (Claude)
// This is the ONLY place the Anthropic API is called directly.
// ---------------------------------------------------------------
export class AnthropicProvider {
  constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
    if (!apiKey) {
      throw new Error(
        "AnthropicProvider requires an API key. Set ANTHROPIC_API_KEY as an environment variable."
      );
    }
    this.apiKey = apiKey;
  }

  /**
   * @param {{by: string, value: string}} brokenLocator - the locator that failed
   * @param {{html: string, url: string}} pageContext - a snippet of the page's HTML and its URL
   * @returns {Promise<string|null>} a suggested CSS selector, or null
   */
  async suggestLocator(brokenLocator, pageContext) {
    const prompt = `A test automation locator failed to find an element.

Original locator: ${JSON.stringify(brokenLocator)}
Page URL: ${pageContext.url}
Relevant HTML snippet (truncated):
${pageContext.html.slice(0, 3000)}

Based on the HTML, suggest a single CSS selector that would most likely
find the intended element now. Respond with ONLY the CSS selector text,
nothing else. If you cannot confidently suggest one, respond with exactly: NONE`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 100,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      console.warn(`AnthropicProvider: API call failed (${response.status}), skipping self-heal`);
      return null;
    }

    const data = await response.json();
    const text = data.content?.find((block) => block.type === "text")?.text?.trim();

    if (!text || text === "NONE") return null;
    return text;
  }
}

export { assertImplementsAiProvider, REQUIRED_METHODS as AI_PROVIDER_METHODS };
