/* eslint-disable no-console */
/**
 * Screenshots the five admin dashboard design variants.
 *
 * Requires a running server with the *production* build. With `output: "standalone"`,
 * `next start` is unreliable — use the standalone Node server after copying static:
 *
 *   npm run build
 *   node scripts/prepare-standalone-static.cjs
 *   cd .next/standalone/apps/web && set PORT=3003 && node server.js
 *
 * Then: set BASE_URL=http://127.0.0.1:3003&& npm run capture-design-previews
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "..", "design-previews");
fs.mkdirSync(outDir, { recursive: true });
const base = process.env.BASE_URL || "http://127.0.0.1:3000";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    for (const v of ["v1", "v2", "v3", "v4", "v5"]) {
      const url = `${base}/admin/design-preview/${v}`;
      console.log("Capturing", url);
      await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
      await page.screenshot({
        path: path.join(outDir, `admin-dashboard-${v}.png`),
        fullPage: true
      });
    }
    console.log("Done. Files in:", outDir);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
