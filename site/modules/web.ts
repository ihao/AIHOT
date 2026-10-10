// What the site's modules add to the web pages (site/modules/index.ts).
import type { WebModule } from "@aihot/web/modules";

import { marketWeb } from "../../modules/ninebtc-market/web.tsx";

export const WEB_MODULES: readonly WebModule[] = [marketWeb];
