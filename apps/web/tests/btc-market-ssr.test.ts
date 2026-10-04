import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { transformWithOxc } from "vite";

test("cached BTC markup stays identical when the hydration clock crosses fifteen minutes", async () => {
  // Render the actual component with the same loader data at two different client clock times.
  const source = await readFile(new URL("../app/features/market/BtcPriceBar.tsx", import.meta.url), "utf8");
  const transformed = await transformWithOxc(source, "BtcPriceBar.tsx", { jsx: { runtime: "automatic" } });
  const compiled = transformed.code
    .replaceAll('"react/jsx-runtime"', JSON.stringify(import.meta.resolve("react/jsx-runtime")))
    .replaceAll('"react"', JSON.stringify(import.meta.resolve("react")))
    .replaceAll('"../../lib/btc-market"', JSON.stringify(new URL("../app/lib/btc-market.ts", import.meta.url).href));
  const { BtcPriceBar } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
  const at = Date.parse("2026-10-04T16:00:00Z");
  const initialQuote = { priceUsd: 61000.25, source: "Coinbase", currency: "USD", quotedAt: new Date(at).toISOString(), fetchedAt: new Date(at).toISOString() };
  const originalNow = Date.now;
  try {
    Date.now = () => at + 899_000;
    const server = renderToString(createElement(BtcPriceBar, { initialQuote, initialNow: Date.now() }));
    Date.now = () => at + 901_000;
    const hydration = renderToString(createElement(BtcPriceBar, { initialQuote, initialNow: at + 899_000 }));
    assert.equal(hydration, server);
    assert.ok(!hydration.includes("行情更新延迟"));
    const alreadyDelayed = renderToString(createElement(BtcPriceBar, { initialQuote, initialNow: at + 901_000 }));
    assert.ok(alreadyDelayed.includes("行情更新延迟"));
  } finally { Date.now = originalNow; }
});
