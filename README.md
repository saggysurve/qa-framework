qa-framework
A unified test automation framework covering web, mobile, and API — one shared
contract (`UiExecutor` / `ApiExecutor`), three interchangeable adapters underneath.
Why this exists
Instead of three separate, disconnected tools (a Playwright project, an Appium
project, a Postman collection), every surface is tested through the same
shape. A test author writes against the interface, never against Playwright,
Appium, or fetch directly — so swapping a tool later means writing one new
adapter, not rewriting every test.
Structure
```
qa-framework/
├── evidence/                     # screenshots + captured evidence from test runs
├── src/
│   ├── core/
│   │   └── UiExecutor.js         # the contract — documents required methods,
│   │                              # plus assertImplementsUiExecutor() runtime check
│   └── adapters/
│       ├── playwright-adapter.js # web — implements UiExecutor
│       ├── appium-adapter.js     # mobile — implements UiExecutor
│       └── http-api-adapter.js   # API — implements ApiExecutor
├── package.json
```
Which adapter do I use?
Testing...	Use	Locator style
A website / web app	`PlaywrightAdapter`	`{ by: "id" | "testId" | "role" | "text", value }`
A native Android app	`AppiumAdapter`	`{ by: "accessibilityId" | "id" | "text", value }`
A REST API	`HttpApiAdapter`	N/A — uses `{ method, path, body, headers }` requests instead
All three UI-facing adapters (web, mobile) share the exact same neutral
`Locator` shape and the exact same method names (`click`, `type`, `getText`,
`waitFor`, `navigate`, `setup`, `teardown`, `captureEvidence`). A test written
against `UiExecutor` doesn't need to know or care which adapter is running
underneath it.
Running the existing tests
Each adapter file is currently also a runnable test script:
```bash
# Web (requires no extra setup)
node src/adapters/playwright-adapter.js

# Mobile (requires: phone connected via USB, Appium server running — npx appium)
node src/adapters/appium-adapter.js

# API (requires nothing extra — just Node 18+)
node src/adapters/http-api-adapter.js
```
What's proven so far
Web: positive login test + negative invalid-password test, both against
a real site (practicetestautomation.com)
Mobile: real Android device over USB, launches the Calculator app,
captures a screenshot
API: positive GET test with schema validation + negative 404 test,
against a real public API (jsonplaceholder.typicode.com)
Contract enforcement: `assertImplementsUiExecutor()` checks any adapter
against the required method list at runtime, catching a missing method with
a clear error instead of a confusing crash
What's next (see the full roadmap doc for detail)
Phase 5 — AI-assisted test authoring and self-healing locators
Phase 6 — CI/CD integration with security gates
Phase 7 — Cloud infrastructure (containers, parallel execution)
Phase 8 — Observability and audit logging
Phase 9 — Pilot on a real team, then org-wide rollout
A note on locators
Real apps don't always cooperate with your first assumption about how
they're built. The web adapter originally only supported `testId`/`role`/
`text` locators, but the practice site used plain `id="..."` attributes —
so an `id` case was added to `resolve()`. That's the adapter pattern working
as intended: the interface didn't need to change, only the translation
layer inside one adapter did.
