# ------------------------------------------------------------------
# Dockerfile for qa-framework — web + API test execution
# ------------------------------------------------------------------
# Mobile tests are intentionally NOT included here — they require a
# physical device or emulator, which a container doesn't have. This
# image covers exactly what portable, parallel-friendly execution
# actually needs: web (Playwright) and API tests.

# Use Playwright's official image — it comes with Chromium and all
# its OS-level dependencies pre-installed, so we skip the slow
# "apt-get install fonts..." step we saw eating 20 minutes in CI.
FROM mcr.microsoft.com/playwright:v1.62.1-jammy

WORKDIR /app

# Copy dependency manifests first (Docker caches this layer —
# rebuilds are fast unless package.json actually changes)
COPY package*.json ./
RUN npm install

# Now copy the rest of the project
COPY . .

# Default command: run both test suites back to back.
# Override at run-time with `docker run <image> node src/adapters/http-api-adapter.js`
# to run just one suite instead.
CMD ["sh", "-c", "node src/adapters/playwright-adapter.js && node src/adapters/http-api-adapter.js"]
