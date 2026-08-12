/**
 * FRAMEWORK CORE — UiExecutor contract
 * ------------------------------------------------------------------
 * Plain JavaScript has no real "interface" keyword, so this file is
 * the contract by convention: every adapter (Playwright, Appium, etc.)
 * must implement all of these methods with these exact signatures.
 *
 * This is what makes the framework "one master framework" instead of
 * three separate tools glued together — test code is written against
 * THIS contract, never against a specific tool's API.
 *
 * @typedef {Object} Locator
 * @property {"role"|"text"|"testId"|"accessibilityId"|"id"} by
 * @property {string} value
 *
 * @typedef {Object} TestContext
 * @property {"dev"|"staging"|"prod"} environment
 * @property {string} runId
 * @property {string} [baseUrl]
 *
 * @typedef {Object} Evidence
 * @property {"screenshot"|"video"|"network-log"|"response-body"} type
 * @property {string} path
 *
 * @interface UiExecutor
 * Every method below must exist on any class claiming to be a UiExecutor.
 *
 * setup(context: TestContext): Promise<void>
 * teardown(): Promise<void>
 * captureEvidence(label: string): Promise<Evidence>
 * navigate(target: string): Promise<void>
 * click(locator: Locator): Promise<void>
 * type(locator: Locator, text: string): Promise<void>
 * getText(locator: Locator): Promise<string>
 * waitFor(locator: Locator, timeoutMs?: number): Promise<void>
 */

// The list of methods every UiExecutor must implement.
// Add to this list if the contract grows — every adapter will then
// be checked against the new method automatically.
const UI_EXECUTOR_METHODS = [
  "setup",
  "teardown",
  "captureEvidence",
  "navigate",
  "click",
  "type",
  "getText",
  "waitFor",
];

/**
 * Throws a clear error if `adapter` is missing any required method,
 * instead of failing later with a confusing "X is not a function".
 *
 * Call this once, right after constructing any adapter, e.g.:
 *   const executor = new PlaywrightAdapter();
 *   assertImplementsUiExecutor(executor);
 *
 * @param {object} adapter
 */
function assertImplementsUiExecutor(adapter) {
  const missing = UI_EXECUTOR_METHODS.filter(
    (method) => typeof adapter[method] !== "function"
  );

  if (missing.length > 0) {
    throw new Error(
      `${adapter.constructor.name} does not fully implement UiExecutor. ` +
      `Missing method(s): ${missing.join(", ")}`
    );
  }
}

export { UI_EXECUTOR_METHODS, assertImplementsUiExecutor };