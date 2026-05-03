import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.QALAM_BASE_URL ?? "http://localhost:3000";
const OUTPUT_DIR = path.resolve("docs", "ux-snapshots");

/** All implemented app routes (+ dynamic examples). */
const ROUTES = [
  "/",
  "/services",
  "/services/export",
  "/knowledge",
  "/news",
  "/search",
  "/knowledge/1",
  "/news/1",
  "/contacts",
  "/vacancies",
  "/auth/login",
  "/cabinet",
  "/cabinet/applications",
  "/cabinet/applications/lease-001",
  "/cabinet/applications/lease-001/form",
  "/cabinet/documents",
  "/cabinet/notifications",
  "/cabinet/profile",
  "/cabinet/bookings",
  "/admin",
  "/admin/content",
  "/admin/services",
  "/admin/forms",
  "/admin/applications",
  "/admin/users",
  "/admin/analytics",
  "/admin/dictionaries",
  "/admin/settings"
];

function toFileName(route) {
  if (route === "/") {
    return "home";
  }
  const q = route.indexOf("?");
  const base = q === -1 ? route : route.slice(0, q);
  const query = q === -1 ? "" : route.slice(q + 1);
  const fromPath = base.replace(/^\//, "").replace(/\//g, "__");
  if (!query) {
    return fromPath;
  }
  const safeQuery = query.replace(/[^a-zA-Z0-9=-]+/g, "_");
  return `${fromPath}__${safeQuery}`;
}

async function capture() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  console.log(`Capturing ${ROUTES.length} routes from ${BASE_URL}`);
  for (const route of ROUTES) {
    const url = `${BASE_URL}${route}`;
    const fileName = `${toFileName(route)}.png`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(800);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`OK  ${route} -> ${filePath}`);
    } catch (error) {
      console.log(`FAIL ${route} -> ${String(error)}`);
    }
  }

  await browser.close();
}

capture().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
