import { useRouteLoaderData } from "react-router";
import type { BtcMarketResponse } from "@aihot/contracts/market";
import type { RootModuleData } from "../../apps/web/app/lib/module-data";
import { defineWebModule } from "../../apps/web/app/modules";
import { BtcPriceBar } from "../../apps/web/app/features/market/BtcPriceBar";
import { btcRenderClock } from "../../apps/web/app/lib/btc-market";

function MarketBar() {
  const root = useRouteLoaderData<{ modules?: Record<string, RootModuleData> }>("root");
  const snapshot = root?.modules?.["ninebtc-market"];
  const market = snapshot?.data.market as BtcMarketResponse | null | undefined;
  return <BtcPriceBar initialQuote={market?.quote ?? null} initialNow={market?.quote ? snapshot!.now : 0} />;
}

export const marketWeb = defineWebModule({
  name: "ninebtc-market",
  root: {
    data: { market: "/api/site/market/btc" },
    renderClock: (data, now) => btcRenderClock((data.market as BtcMarketResponse | null)?.quote ?? null, now),
    Top: MarketBar,
  },
});
