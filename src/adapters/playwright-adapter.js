/**
 * PLAYWRIGHT ADAPTER — plain JavaScript version
 * ------------------------------------------------------------------
 * This is the ONLY file in the whole framework that imports Playwright.
 * Everything else (tests, other adapters, the AI layer) should only
 * call the methods below — never reach into Playwright directly.
 *
 * Locator shape used throughout: { by: "role" | "text" | "testId" | "accessibilityId", value: string }
 */

import { chromium } from "playwright";
import { assertImplementsUiExecutor } from "../core/UiExecutor.js";

export class PlaywrightAdapter {
  browser = null;
  page = null;
  baseUrl = "";

  async setup(context) {
    this.baseUrl = context.baseUrl ?? "";
    // headless: false while debugging locally, true in CI
    this.browser = await chromium.launch({
      headless: context.environment !== "dev",
    });
    this.page = await this.browser.newPage();
  }

  async navigate(target) {
    const url = target.startsWith("http") ? target : `${this.baseUrl}${target}`;
    await this.page.goto(url, { waitUntil: "domcontentloaded" });
  }

  async click(locator) {
    await this.resolve(locator).click();
  }

  async type(locator, text) {
    await this.resolve(locator).fill(text);
  }

  async getText(locator) {
    return (await this.resolve(locator).innerText()).trim();
  }

  async waitFor(locator, timeoutMs = 5000) {
    await this.resolve(locator).waitFor({ state: "visible", timeout: timeoutMs });
  }

  async captureEvidence(label) {
    const path = `evidence/${label}.png`;
    await this.page.screenshot({ path, fullPage: true });
    return { type: "screenshot", path };
  }

  async teardown() {
    await this.browser?.close();
  }

  // ---------------------------------------------------------------
  // The one method that knows how to turn a neutral locator into
  // an actual Playwright locator. This is the translation boundary —
  // if Playwright's API changes, only this method needs updating.
  // ---------------------------------------------------------------
  resolve(locator) {
  switch (locator.by) {
    case "id":
      return this.page.locator(`#${locator.value}`);
    case "testId":
      return this.page.getByTestId(locator.value);
    case "role": {
      const [role, name] = locator.value.split(":");
      return name
        ? this.page.getByRole(role, { name })
        : this.page.getByRole(role);
    }
    case "text":
      return this.page.getByText(locator.value);
    case "accessibilityId":
      return this.page.getByTestId(locator.value);
    default:
      throw new Error(`Unsupported locator type: ${locator.by}`);
  }
}
}

// ---------------------------------------------------------------
// Example: a runnable login test using the adapter
// ---------------------------------------------------------------
async function loginFlowTest() {
  const executor = new PlaywrightAdapter();
  assertImplementsUiExecutor(executor);
  await executor.setup({
    environment: "staging",
    runId: "run-1234",
    baseUrl: "https://practicetestautomation.com",
  });

  try {
    await executor.navigate("/practice-test-login/");
    await executor.type({ by: "id", value: "username" }, "student");
    await executor.type({ by: "id", value: "password" }, "Password123");
    await executor.click({ by: "id", value: "submit" });
    await executor.waitFor({ by: "text", value: "ThisTextWillNeverAppear" });
    await executor.captureEvidence("login-success");
  } catch (err) {
    await executor.captureEvidence("login-failure");
    throw err;
  } finally {
    await executor.teardown();
  }
}

async function invalidPasswordTest() {
  const executor = new PlaywrightAdapter();
  assertImplementsUiExecutor(executor);
  await executor.setup({
    environment: "staging",
    runId: "run-1235",
    baseUrl: "https://practicetestautomation.com",
  });

  try {
    await executor.navigate("/practice-test-login/");
    await executor.type({ by: "id", value: "username" }, "student");
    await executor.type({ by: "id", value: "password" }, "wrongPassword");
    await executor.click({ by: "id", value: "submit" });
    await executor.waitFor({ by: "id", value: "error" });

    const errorText = await executor.getText({ by: "id", value: "error" });
    const expected = "Your password is invalid!";

    if (!errorText.includes(expected)) {
      throw new Error(`Expected error "${expected}" but got "${errorText}"`);
    }

    console.log("PASS: invalidPasswordTest — got expected error message");
    await executor.captureEvidence("invalid-password-error");
  } catch (err) {
    await executor.captureEvidence("invalid-password-failure");
    throw err;
  } finally {
    await executor.teardown();
  }
}

async function runAll() {
  console.log("Starting test run...");
  await loginFlowTest();
  console.log("loginFlowTest done");
  await invalidPasswordTest();
  console.log("invalidPasswordTest done");
}

runAll();