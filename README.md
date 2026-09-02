# qa-framework

A unified test automation framework covering web, mobile, and API — one shared
contract, AI-assisted authoring and self-healing, containerized execution, and
a real CI/CD pipeline with security gates.

## Quick start

```bash
npm install
npx playwright install chromium

npm test              # runs web + API suites
npm run test:mobile   # requires a connected Android device + local Appium server
npm run test:self-heal
npm run report         # generates reports/dashboard.html

npm run docker:build   # containerize web + API suites
npm run docker:run
```

## Why this exists

Instead of three separate, disconnected tools (a Playwright project, an Appium
project, a Postman collection), every surface is tested through the same
shape. A test author writes against the interface, never against Playwright,
Appium, or fetch directly — so swapping a tool later means writing one new
adapter, not rewriting every test.

## Architecture

```
qa-framework/
├── .github/workflows/ci.yml      # runs web + API tests on every push/PR
├── Dockerfile / .dockerignore    # containerized execution
├── evidence/                      # screenshots from local test runs
├── reports/
│   ├── run-log.json               # structured pass/fail history
│   ├── audit-log.jsonl            # append-only: who ran what, when
│   └── dashboard.html             # generated — open in a browser
├── src/
│   ├── core/
│   │   ├── UiExecutor.js          # the UI/API contract + runtime check
│   │   ├── AiProvider.js          # model-agnostic AI contract
│   │   ├── AnthropicProvider.js   # Claude implementation
│   │   ├── OpenRouterProvider.js  # free-tier implementation
│   │   ├── SelfHealingResolver.js # wraps an adapter, retries with AI on failure
│   │   ├── TestReporter.js        # records results, audit log, AI triage
│   │   └── generate-dashboard.js  # static HTML report generator
│   └── adapters/
│       ├── playwright-adapter.js  # web
│       ├── appium-adapter.js      # mobile
│       ├── http-api-adapter.js    # API
│       └── self-heal-test.js      # demonstrates self-healing locators
```

## Which adapter do I use?

| Testing... | Adapter | Locator style |
|---|---|---|
| A website / web app | `PlaywrightAdapter` | `{ by: "id" \| "testId" \| "role" \| "text", value }` |
| A native Android app | `AppiumAdapter` | `{ by: "accessibilityId" \| "id" \| "text", value }` |
| A REST API | `HttpApiAdapter` | N/A — uses `{ method, path, body, headers }` requests |

All UI-facing adapters share the same neutral `Locator` shape and the same
method names (`click`, `type`, `getText`, `waitFor`, `navigate`, `setup`,
`teardown`, `captureEvidence`) — test code doesn't need to know which tool is
running underneath it.

## AI-assisted testing

`SelfHealingResolver` wraps any `UiExecutor` adapter: if a locator fails, it
captures the live page HTML and asks an `AiProvider` (Claude or a free
OpenRouter model — swappable, same contract) to suggest a working selector,
retries once, and logs whether healing was needed. Proven to recover from a
deliberately broken locator in `self-heal-test.js`.

## CI/CD

Every push and PR runs the web + API suites via GitHub Actions
(`.github/workflows/ci.yml`), with:
- **Branch protection** — `main` requires the CI check to pass, including for
  admins (no silent bypass)
- **CodeQL** — static analysis (SAST) on every push
- **Secret scanning + push protection** — blocks commits containing exposed
  API keys before they reach the repo
- **Playwright browser caching** — keeps CI runs fast after the first run

Secrets used by tests (e.g. `OPENROUTER_API_KEY`) are stored as GitHub
repository secrets, not committed — see Settings → Secrets and variables →
Actions on the repo itself.

## Observability

`TestReporter` records every test's outcome to `reports/run-log.json`
(pass/fail, duration, timestamp) and appends a compliance-style entry to
`reports/audit-log.jsonl` (who ran it, when, which tests, which environment).
Failed tests get a lightweight AI-assisted classification (e.g. "likely
flaky/timing issue" vs. "likely real assertion failure") to help prioritize
triage. Run `npm run report` any time to regenerate `dashboard.html`.

## Containerization

The `Dockerfile` uses Playwright's official base image (browser binaries
pre-installed, so no slow OS dependency install) and packages the web + API
suites into a portable image. Proven to run 10 containers concurrently on a
single laptop with no cross-container interference — see commit history for
the load test.

## Mobile testing

`AppiumAdapter` targets a real Android device connected over USB with a local
Appium server (`npx appium`) — not run in CI, since standard runners don't
have a physical device or emulator attached. Real cloud device execution
(BrowserStack/Sauce Labs-style) is a natural extension of the containerized
setup above but wasn't set up for this project.

## A note on locators

Real apps don't always cooperate with your first assumption about how
they're built. The web adapter originally only supported `testId`/`role`/
`text` locators, but the practice site used plain `id="..."` attributes —
so an `id` case was added to `resolve()`. That's the adapter pattern working
as intended: the *interface* didn't need to change, only the translation
layer inside one adapter did.

## What's next

- Broader test coverage per adapter (this project intentionally proved the
  pattern with one or two tests per surface, not exhaustive coverage)
- Real cloud device execution for mobile in CI
- Team pilot and rollout, if used beyond a single-person project