import assert from "node:assert/strict";
import { test } from "node:test";

test("BTC module schedules only when the collect valve is explicitly true", async () => {
  const { marketModule } = await import("../modules/ninebtc-market/server.ts");
  const schedule = marketModule.schedules!.find(s => s.name === "market.btc-usd")!;
  assert.equal(schedule.cron, "*/5 * * * *");
  const old = process.env.COLLECT_ENABLED;
  try {
    for (const value of [undefined, "false", "1", "true"]) {
      if (value === undefined) delete process.env.COLLECT_ENABLED; else process.env.COLLECT_ENABLED = value;
      assert.equal(schedule.when!(), value === "true");
    }
  } finally { if (old === undefined) delete process.env.COLLECT_ENABLED; else process.env.COLLECT_ENABLED = old; }
});

test("BTC collector stays inert when collect is unset or not explicitly true", async () => {
  const { collectBtcUsdQuote } = await import("../modules/ninebtc-market/backend/collect.ts");
  const old = process.env.COLLECT_ENABLED;
  try {
    for (const value of [undefined, "false", "1"]) {
      if (value === undefined) delete process.env.COLLECT_ENABLED; else process.env.COLLECT_ENABLED = value;
      assert.equal(await collectBtcUsdQuote({ fetch: async () => { throw new Error("disabled fetch"); } }), null);
    }
  } finally { if (old === undefined) delete process.env.COLLECT_ENABLED; else process.env.COLLECT_ENABLED = old; }
});
