import { PlaywrightAdapter } from "./playwright-adapter.js";
import { OpenRouterProvider } from "../core/OpenRouterProvider.js";
import { SelfHealingResolver } from "../core/SelfHealingResolver.js";

async function selfHealTest() {
  const executor = new PlaywrightAdapter();
  await executor.setup({
    environment: "staging",
    runId: "heal-run-1",
    baseUrl: "https://practicetestautomation.com",
  });

  const healer = new SelfHealingResolver(executor, new OpenRouterProvider());

  try {
    await executor.navigate("/practice-test-login/");
    await healer.run("type", { by: "id", value: "usernameeee" }, "student"); // deliberately broken
    await healer.run("type", { by: "id", value: "password" }, "Password123");
    await healer.run("click", { by: "id", value: "submit" });
    await healer.run("waitFor", { by: "text", value: "Congratulations" });
    console.log("PASS: selfHealTest — recovered from a broken locator");
  } finally {
    await executor.teardown();
  }
}

selfHealTest();