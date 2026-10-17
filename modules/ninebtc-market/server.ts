import { defineServerModule } from "@aihot/backend/modules";
import { getLatestBtcUsdQuote } from "@aihot/backend/publication/market";
import { collectBtcUsdQuote } from "./backend/collect.ts";
import { bindIngestionQuote } from "./backend/ingestion.ts";
import { applyPublicHeaders, sendJsonWithEtag } from "../../apps/api/src/http/respond.ts";

export const marketModule = defineServerModule({
  name: "ninebtc-market",
  http(app) {
    for (const path of ["/api/v1/market/btc-usd", "/api/site/market/btc"]) {
      app.get(path, async (request, reply) => {
        applyPublicHeaders(reply);
        return sendJsonWithEtag(request, reply, { quote: await getLatestBtcUsdQuote() }, { etagPrefix: "btc-usd", cacheControl: "public, max-age=60" });
      });
    }
  },
  schedules: [{ name: "market.btc-usd", cron: "*/5 * * * *", missed: "skip", when: () => process.env.COLLECT_ENABLED === "true", run: () => collectBtcUsdQuote() }],
  on: { articleIngested: ({ id }, tx) => bindIngestionQuote(id, tx) },
});
