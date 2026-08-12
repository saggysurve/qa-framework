/**
 * API ADAPTER — plain JavaScript version
 * ------------------------------------------------------------------
 * This is the ONLY file in the whole framework that makes raw HTTP
 * calls. Everything else should only call the methods below.
 *
 * Implements the ApiExecutor contract (see src/core/UiExecutor.js —
 * worth eventually renaming that file to something like
 * FrameworkContracts.js now that it holds more than UI shapes).
 *
 * Uses Node's built-in fetch (Node 18+), so no extra HTTP library
 * needed — one less dependency than the web/mobile adapters required.
 */

const BASE_URL = "https://jsonplaceholder.typicode.com";

export class HttpApiAdapter {
  runId = "";

  async setup(context) {
    this.runId = context.runId;
    // No session/browser/driver to start for a stateless HTTP API —
    // this exists purely to satisfy the ApiExecutor contract.
  }

  async send(request) {
    const url = `${BASE_URL}${request.path}`;
    const options = {
      method: request.method,
      headers: {
        "Content-Type": "application/json",
        ...(request.headers || {}),
      },
    };
    if (request.body) {
      options.body = JSON.stringify(request.body);
    }

    const response = await fetch(url, options);
    const body = await response.json().catch(() => null);

    return {
      status: response.status,
      body,
      headers: Object.fromEntries(response.headers.entries()),
    };
  }

  // Lightweight schema check — confirms required fields exist with
  // the right type, without pulling in a full JSON-schema library.
  // Good enough for now; swap for ajv later if schemas get complex.
  async validateSchema(response, expectedShape) {
    if (!response.body) return false;
    const entries = Object.entries(expectedShape);
    return entries.every(([key, type]) => typeof response.body[key] === type);
  }

  async captureEvidence(label) {
    const path = `evidence/${label}.json`;
    // In a real setup this would write the last response to disk.
    // Kept simple here — logs to console so you can see it inline.
    console.log(`[evidence] ${label} captured (see console output above)`);
    return { type: "response-body", path };
  }

  async teardown() {
    // Nothing to tear down for stateless HTTP — kept for contract symmetry.
  }
}

// ---------------------------------------------------------------
// Example tests: one positive (GET a real post), one negative
// (GET a post that doesn't exist, expect a 404) — same
// positive/negative pattern as your web login tests.
// ---------------------------------------------------------------
async function getPostTest() {
  const executor = new HttpApiAdapter();
  await executor.setup({ environment: "dev", runId: "api-run-1" });

  const response = await executor.send({ method: "GET", path: "/posts/1" });

  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }

  const valid = await executor.validateSchema(response, {
    id: "number",
    title: "string",
    body: "string",
    userId: "number",
  });

  if (!valid) {
    throw new Error(`Response did not match expected schema: ${JSON.stringify(response.body)}`);
  }

  console.log("PASS: getPostTest — status 200, schema valid");
  await executor.captureEvidence("get-post-success");
  await executor.teardown();
}

async function getNonExistentPostTest() {
  const executor = new HttpApiAdapter();
  await executor.setup({ environment: "dev", runId: "api-run-2" });

  const response = await executor.send({ method: "GET", path: "/posts/99999" });

  if (response.status !== 404) {
    throw new Error(`Expected status 404 for non-existent post, got ${response.status}`);
  }

  console.log("PASS: getNonExistentPostTest — correctly got 404");
  await executor.captureEvidence("get-post-not-found");
  await executor.teardown();
}

async function runAll() {
  console.log("Starting API test run...");
  await getPostTest();
  await getNonExistentPostTest();
  console.log("API test run done");
}

runAll();