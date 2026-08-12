/**
 * APPIUM ADAPTER — plain JavaScript version
 * ------------------------------------------------------------------
 * This is the ONLY file in the whole framework that imports the
 * Appium/WebdriverIO client. Everything else should only call the
 * methods below — never talk to WebdriverIO directly.
 *
 * Implements the same UiExecutor contract as PlaywrightAdapter.js —
 * see src/core/UiExecutor.js for the documented shape.
 *
 * Locator shape used throughout:
 *   { by: "accessibilityId" | "id" | "text", value: string }
 * (mobile apps rarely have "role" or "testId" the way web does —
 *  accessibilityId is the mobile equivalent of a good testId)
 */

import { remote } from "webdriverio";

export class AppiumAdapter {
  driver = null;

  async setup(context) {
    this.driver = await remote({
      protocol: "http",
      hostname: "127.0.0.1",
      port: 4723,
      path: "/",
      capabilities: {
        platformName: "Android",
        "appium:automationName": "UiAutomator2",
        "appium:deviceName": "Android",
        "appium:appPackage": "com.sec.android.app.popupcalculator",
        "appium:appActivity": ".Calculator",
        "appium:noReset": true,
      },
    });
  }

  // For mobile, "navigate" doesn't mean a URL — the app is already
  // launched by setup(). This exists to satisfy the UiExecutor
  // contract and can be used later for deep links if needed.
  async navigate(target) {
    // no-op for a native app launched via capabilities;
    // kept here so this class still satisfies UiExecutor
  }

  async click(locator) {
    const el = await this.resolve(locator);
    await el.click();
  }

  async type(locator, text) {
    const el = await this.resolve(locator);
    await el.setValue(text);
  }

  async getText(locator) {
    const el = await this.resolve(locator);
    return (await el.getText()).trim();
  }

  async waitFor(locator, timeoutMs = 5000) {
    const el = await this.resolve(locator);
    await el.waitForDisplayed({ timeout: timeoutMs });
  }

  async captureEvidence(label) {
    const path = `evidence/${label}.png`;
    await this.driver.saveScreenshot(path);
    return { type: "screenshot", path };
  }

  async teardown() {
    await this.driver?.deleteSession();
  }

  // ---------------------------------------------------------------
  // The one method that knows how to turn a neutral locator into
  // an actual WebdriverIO/Appium selector. Same translation-boundary
  // pattern as PlaywrightAdapter's resolve() method.
  // ---------------------------------------------------------------
  async resolve(locator) {
    switch (locator.by) {
      case "accessibilityId":
        return this.driver.$(`~${locator.value}`);
      case "id":
        // Android resource-id, e.g. "com.sec.android.app.popupcalculator:id/btn_1"
        return this.driver.$(`id=${locator.value}`);
      case "text":
        return this.driver.$(`android=new UiSelector().text("${locator.value}")`);
      default:
        throw new Error(`Unsupported locator type: ${locator.by}`);
    }
  }
}

// ---------------------------------------------------------------
// Example test: verify the calculator app launches and shows
// its display element. Kept deliberately simple for a first run —
// we're proving the adapter works, not testing calculator logic yet.
// ---------------------------------------------------------------
async function calculatorLaunchTest() {
  const executor = new AppiumAdapter();

  try {
    console.log("Launching calculator app...");
    await executor.setup({ environment: "dev", runId: "mobile-run-1" });
    console.log("App launched successfully");

    await executor.captureEvidence("calculator-launched");
    console.log("PASS: calculatorLaunchTest — screenshot captured");
  } catch (err) {
    console.error("FAIL:", err.message);
    throw err;
  } finally {
    await executor.teardown();
  }
}

calculatorLaunchTest();
