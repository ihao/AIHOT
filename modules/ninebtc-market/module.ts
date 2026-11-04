import { defineModule } from "@aihot/contracts/modules";

export const marketDeclaration = defineModule({
  name: "ninebtc-market",
  apiPaths: [/^\/api\/v1\/market\/btc-usd$/, /^\/api\/site\/market\/btc$/],
});
