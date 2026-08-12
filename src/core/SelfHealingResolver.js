/**
 * SELF-HEALING RESOLVER
 * ------------------------------------------------------------------
 * Wraps an existing UiExecutor's locator resolution: try the normal
 * locator first. If it can't be found within a short timeout, ask
 * the AI provider for a suggested alternative, retry once with that.
 *
 * This is intentionally a WRAPPER around PlaywrightAdapter, not a
 * change to PlaywrightAdapter itself — keeps the adapter simple and
 * makes self-healing opt-in per test, not forced on every run.
 */

export class SelfHealingResolver {
  /**
   * @param {import("./playwright-adapter.js").PlaywrightAdapter} adapter
   * @param {{suggestLocator: Function}} aiProvider
   */
  constructor(adapter, aiProvider) {
    this.adapter = adapter;
    this.aiProvider = aiProvider;
  }

  /**
   * Attempts the given action (click/type/getText/waitFor) with the
   * original locator. On failure, asks the AI for a fallback selector,
   * retries once, and logs whether healing was needed.
   *
   * @param {"click"|"type"|"getText"|"waitFor"} action
   * @param {{by: string, value: string}} locator
   * @param {...any} extraArgs - e.g. text for type()
   */
  async run(action, locator, ...extraArgs) {
    try {
      return await this.adapter[action](locator, ...extraArgs);
    } catch (originalError) {
      console.warn(`Locator failed (${JSON.stringify(locator)}), attempting self-heal...`);

      const html = await this.adapter.page.content();
      const url = this.adapter.page.url();

      const suggestion = await this.aiProvider.suggestLocator(locator, { html, url });

      if (!suggestion) {
        console.warn("Self-heal: AI had no confident suggestion, failing as normal");
        throw originalError;
      }

      console.log(`Self-heal: trying AI-suggested selector "${suggestion}"`);

      // Use Playwright's raw CSS locator directly for the AI's suggestion,
      // since it won't match our neutral Locator "by" types.
      const el = this.adapter.page.locator(suggestion);

      try {
        if (action === "click") await el.click();
        else if (action === "type") await el.fill(extraArgs[0]);
        else if (action === "getText") return (await el.innerText()).trim();
        else if (action === "waitFor") await el.waitFor({ state: "visible" });

        console.log(`Self-heal: SUCCEEDED with "${suggestion}" — consider updating the test's locator`);
      } catch (healError) {
        console.warn("Self-heal: AI suggestion also failed");
        throw originalError; // surface the original failure, not the heal attempt's
      }
    }
  }
}
