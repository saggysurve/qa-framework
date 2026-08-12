/**
 * OPENROUTER PROVIDER — free-tier implementation of AiProvider
 * ------------------------------------------------------------------
 * Same contract as AnthropicProvider (see AiProvider.js) — this is
 * the proof that swapping AI vendors really is just "write one new
 * class." Nothing in SelfHealingResolver.js or any test needs to
 * change to use this instead of Claude.
 *
 * Uses OpenRouter's OpenAI-compatible endpoint with a free model.
 */

export class OpenRouterProvider {
  constructor(apiKey = process.env.OPENROUTER_API_KEY, model = "google/gemma-4-26b-a4b-it:free") {
    if (!apiKey) {
      throw new Error(
        "OpenRouterProvider requires an API key. Set OPENROUTER_API_KEY as an environment variable."
      );
    }
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * @param {{by: string, value: string}} brokenLocator
   * @param {{html: string, url: string}} pageContext
   * @returns {Promise<string|null>}
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

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      console.warn(`OpenRouterProvider: API call failed (${response.status}), skipping self-heal`);
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim();

    if (!text || text === "NONE") return null;
    return text;
  }
}
