import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { chromium, expect, type Browser } from "@playwright/test";
import { startWebServer, type WebServer } from "./web-server.ts";

// Run the same browser contract against the normal build and a separate temporary build with
// NAV.hidden=['/hot','/topics']; NINEBTC_NAV_HIDDEN only tells this test the build's expected profile.
const hidden = new Set((process.env.NINEBTC_NAV_HIDDEN ?? "").split(",").filter(Boolean));
let browser: Browser;
let web: WebServer;
const api = createServer((req, res) => {
  const path = new URL(req.url!, "http://local").pathname;
  res.setHeader("Content-Type", "application/json");
  if (path === "/api/site/meta") return res.end(JSON.stringify({ changelogVersion: "fixture" }));
  if (path === "/api/site/timeline") return res.end(JSON.stringify({ filters: { channel: "all", category: null, tag: null }, cards: [], nextCursor: null, hot: null, dayCounts: {} }));
  if (path === "/api/site/hot") return res.end(JSON.stringify({ computedAt: null, windowHours: 48, entries: [] }));
  if (path === "/api/site/topics") return res.end(JSON.stringify({ groups: [], topics: [] }));
  if (path === "/api/site/topics/nav-fixture") return res.end(JSON.stringify({
    topic: { slug: "nav-fixture", name: "导航测试主题", group: "directions", groupName: "主题", definition: "配置验收", brand: null, total: 0, poolTotal: 0, recent: 0, indexable: false, latest: null },
    modules: {}, items: [], page: 1, pageCount: 1, pageSize: 30,
  }));
  res.statusCode = 404;
  res.end("{}");
});
before(async () => {
  web = await startWebServer(api);
  browser = await chromium.launch({ channel: "chromium" });
});
after(async () => { await browser?.close(); await web?.stop(); });

test("desktop sidebar and direct topic return respect the navigation profile", async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  try {
    await page.goto(web.origin);
    const nav = page.locator("aside").getByRole("navigation", { name: "主导航" });
    await expect(nav).toBeVisible();
    for (const path of ["/hot", "/topics"]) await expect(nav.locator(`a[href='${path}']`)).toHaveCount(hidden.has(path) ? 0 : 1);
    await expect(nav.locator("a[href*='预测市场']")).toHaveCount(0);
    await page.goto(web.origin + "/topics/nav-fixture");
    const back = page.getByRole("link", { name: hidden.has("/topics") ? "返回精选" : "返回全部主题", exact: true });
    await expect(back).toHaveAttribute("href", hidden.has("/topics") ? "/" : "/topics");
    await expect(back).toBeVisible();
    if (process.env.NINEBTC_NAV_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.NINEBTC_NAV_SCREENSHOT_DIR}/desktop.png` });
  } finally { await page.close(); }
});

test("phone tab labels, More entry and direct-topic back remain usable when entries are hidden", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  try {
    await page.goto(web.origin + "/more");
    const nav = page.getByRole("navigation", { name: "底部导航" });
    await expect(nav).toBeVisible();
    await expect(nav.locator("a")).toHaveCount(hidden.has("/hot") ? 3 : 4);
    await expect(nav.locator("a[href='/hot']")).toHaveCount(hidden.has("/hot") ? 0 : 1);
    await expect(page.locator("main a[href='/topics']")).toHaveCount(hidden.has("/topics") ? 0 : 1);
    const widths = await nav.locator("a").evaluateAll((links) => links.map((link) => link.getBoundingClientRect().width));
    assert.ok(Math.max(...widths) - Math.min(...widths) < 1, "fewer tabs still occupy equal-width columns");
    for (const label of await nav.locator("a").allTextContents()) assert.ok(label.trim(), "every tab keeps a readable label");
    await page.goto(web.origin + "/topics/nav-fixture");
    const back = page.locator("[data-phone-bar]").getByRole("button", { name: hidden.has("/topics") ? "精选" : "全部主题", exact: true });
    await expect(back).toBeVisible();
    if (process.env.NINEBTC_NAV_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.NINEBTC_NAV_SCREENSHOT_DIR}/phone.png` });
    await back.click();
    await expect(page).toHaveURL(web.origin + (hidden.has("/topics") ? "/" : "/topics"));
  } finally { await page.close(); }
});
