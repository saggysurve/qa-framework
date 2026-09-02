/**
 * DASHBOARD GENERATOR
 * ------------------------------------------------------------------
 * Reads reports/run-log.json and produces reports/dashboard.html —
 * a single self-contained file, no server, no build step. Run this
 * any time after a test run to refresh the view.
 *
 *   node src/core/generate-dashboard.js
 */

import { readFileSync, writeFileSync, existsSync } from "fs";

const RESULTS_FILE = "reports/run-log.json";
const OUTPUT_FILE = "reports/dashboard.html";

if (!existsSync(RESULTS_FILE)) {
  console.error(`No results found at ${RESULTS_FILE}. Run some tests with TestReporter first.`);
  process.exit(1);
}

const results = JSON.parse(readFileSync(RESULTS_FILE, "utf-8"));
const pass = results.filter((r) => r.status === "pass").length;
const fail = results.filter((r) => r.status === "fail").length;
const passRate = results.length ? Math.round((pass / results.length) * 100) : 0;

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const rows = results
  .slice()
  .reverse()
  .map((r) => `
    <tr class="${r.status}">
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.suite)}</td>
      <td><span class="badge ${r.status}">${r.status.toUpperCase()}</span></td>
      <td>${r.durationMs ?? "-"}ms</td>
      <td>${new Date(r.timestamp).toLocaleString()}</td>
      <td>${r.triage ? escapeHtml(r.triage) : "-"}</td>
    </tr>`)
  .join("\n");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>qa-framework — Test Dashboard</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; background: #0f1117; color: #e6e6e6; margin: 0; padding: 32px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .subtitle { color: #9aa0a6; margin-bottom: 24px; font-size: 14px; }
  .stats { display: flex; gap: 16px; margin-bottom: 32px; }
  .stat-card { background: #1a1d27; border-radius: 10px; padding: 16px 24px; min-width: 120px; }
  .stat-card .num { font-size: 28px; font-weight: 700; }
  .stat-card .label { font-size: 12px; color: #9aa0a6; text-transform: uppercase; letter-spacing: 0.04em; }
  .pass-num { color: #4ade80; }
  .fail-num { color: #f87171; }
  table { width: 100%; border-collapse: collapse; background: #1a1d27; border-radius: 10px; overflow: hidden; }
  th, td { text-align: left; padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #262a36; }
  th { color: #9aa0a6; text-transform: uppercase; font-size: 11px; letter-spacing: 0.04em; }
  tr.fail { background: rgba(248, 113, 113, 0.06); }
  .badge { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
  .badge.pass { background: rgba(74, 222, 128, 0.15); color: #4ade80; }
  .badge.fail { background: rgba(248, 113, 113, 0.15); color: #f87171; }
</style>
</head>
<body>
  <h1>qa-framework test dashboard</h1>
  <div class="subtitle">Generated ${new Date().toLocaleString()} · ${results.length} recorded results</div>

  <div class="stats">
    <div class="stat-card"><div class="num">${results.length}</div><div class="label">Total runs</div></div>
    <div class="stat-card"><div class="num pass-num">${pass}</div><div class="label">Passed</div></div>
    <div class="stat-card"><div class="num fail-num">${fail}</div><div class="label">Failed</div></div>
    <div class="stat-card"><div class="num">${passRate}%</div><div class="label">Pass rate</div></div>
  </div>

  <table>
    <thead>
      <tr><th>Test</th><th>Suite</th><th>Status</th><th>Duration</th><th>Timestamp</th><th>AI triage</th></tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;

writeFileSync(OUTPUT_FILE, html);
console.log(`Dashboard written to ${OUTPUT_FILE} — open it in a browser to view.`);
