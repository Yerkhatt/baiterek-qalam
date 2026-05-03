/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const webRoot = path.join(__dirname, "..");
const from = path.join(webRoot, ".next", "static");
const to = path.join(webRoot, ".next", "standalone", "apps", "web", ".next", "static");

if (!fs.existsSync(from)) {
  console.error("Missing:", from, "\nRun: npm run build (from apps/web) or npm run build:web (from repo root)");
  process.exit(1);
}

fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
console.log("Copied Next static assets for standalone:\n ", from, "\n ->\n ", to);
