import assert from "node:assert/strict";
import { test } from "node:test";
import { loadRootModuleData } from "../app/lib/module-data.ts";

test("root module data preloads saved market values and a shared render clock", async () => {
  const quote = { priceUsd: 62000, quotedAt: "2026-10-10T00:00:00Z", fetchedAt: "2026-10-10T00:00:01Z", source: "Coinbase", currency: "USD" };
  const old = Date.now;
  try {
    Date.now = () => 1780000000000;
    const calls: string[] = [];
    const result = await loadRootModuleData(new Request("https://example.com/"), [{ name: "market", root: { data: { market: "/api/site/market/btc" }, renderClock: (_data, now) => now } }, { name: "empty" }], async (path, signal) => {
      assert.equal(signal.aborted, false);
      calls.push(path);
      return { quote };
    });
    assert.deepEqual(calls, ["/api/site/market/btc"]);
    assert.deepEqual(result, { market: { data: { market: { quote } }, now: 1780000000000 } });
  } finally { Date.now = old; }
});

test("one failed module read stays null while independent module data survives", async () => {
  const result = await loadRootModuleData(new Request("https://example.com/"), [{ name: "market", root: { data: { market: "/missing", saved: "/saved" } } }], async path => {
    if (path === "/missing") throw new Error("unavailable");
    return { ok: true };
  });
  assert.deepEqual(result.market.data, { market: null, saved: { ok: true } });
  assert.equal(result.market.now, 0, "data without a clock-dependent view must stay deterministic");
});

test("failed root module reads do not add a request-specific clock to public data", async () => {
  const modules = [{ name: "market", root: { data: { market: "/missing" } } }];
  const read = async () => { throw new Error("unavailable"); };
  const old = Date.now;
  try {
    Date.now = () => 1000;
    const first = await loadRootModuleData(new Request("https://example.com/"), modules, read);
    Date.now = () => 2000;
    const second = await loadRootModuleData(new Request("https://example.com/"), modules, read);
    assert.deepEqual(first, second);
    assert.equal(first.market.now, 0);
  } finally { Date.now = old; }
});
