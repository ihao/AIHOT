import assert from "node:assert/strict";
import { test } from "node:test";
import type { BtcMarketResponse, BtcUsdQuote } from "@aihot/contracts/market";

async function module() {
  const mod = await import("../app/lib/btc-market.ts").catch(() => null);
  assert.ok(mod, "BTC browser refresh and display module must exist");
  return mod;
}
const BASE = Date.parse("2026-10-04T16:00:00Z");
const quote = (at = BASE, priceUsd = 62000.5): BtcUsdQuote => ({ priceUsd, quotedAt: new Date(at).toISOString(), fetchedAt: new Date(at).toISOString(), source: "Coinbase", currency: "USD" });
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function harness() {
  let now = BASE, visible = true, seq = 0;
  const timers = new Map<number, { at:number; run:()=>void }>();
  let onVisibility: (()=>void) | null = null;
  const requests: AbortSignal[] = [];
  const answers: Array<()=>Promise<BtcMarketResponse>> = [];
  const env = {
    now:()=>now,
    visible:()=>visible,
    setTimer:(run:()=>void, ms:number)=> { const id=++seq; timers.set(id,{at:now+ms,run}); return ()=>{timers.delete(id);}; },
    onVisibilityChange:(run:()=>void)=> { onVisibility=run; return ()=>{onVisibility=null;}; },
    fetchQuote:async (signal:AbortSignal)=> { requests.push(signal); return answers.length ? answers.shift()!() : {quote:quote(now)}; },
  };
  return { env, requests, answers, timers,
    hide:()=>{visible=false;onVisibility?.();}, show:()=>{visible=true;onVisibility?.();},
    hasListener:()=>onVisibility!==null,
    advance:async (ms:number)=> {
      const until=now+ms;
      while (true) {
        const next=[...timers].sort((a,b)=>a[1].at-b[1].at).find(([,t])=>t.at<=until);
        if (!next) break;
        now=next[1].at; timers.delete(next[0]); next[1].run(); await flush();
      }
      now=until; await flush();
    },
  };
}

test("BTC USD and ingestion times use dollars and Beijing calendar rollover", async()=> {
  const {formatBtcUsd,formatBtcTime}=await module();
  assert.equal(formatBtcUsd(62000.5),"$62,000.50 USD");
  assert.equal(formatBtcTime("2026-10-04T16:00:15Z"),"2026-10-05 00:00:15（北京时间）");
});
test("quote is delayed when either independent timestamp exceeds fifteen minutes", async()=> {
  const {btcQuoteDelayed}=await module();
  assert.equal(btcQuoteDelayed(quote(),BASE+900000,false),false);
  assert.equal(btcQuoteDelayed(quote(),BASE+900001,false),true);
  assert.equal(btcQuoteDelayed({...quote(),quotedAt:new Date(BASE-900001).toISOString()},BASE,false),true);
  assert.equal(btcQuoteDelayed({...quote(),fetchedAt:new Date(BASE-900001).toISOString()},BASE,false),true);
  assert.equal(btcQuoteDelayed(quote(),BASE,true),true);
});
test("foreground BTC refresh runs immediately then once every ten minutes", async()=> {
  const {startBtcPolling}=await module(); const h=harness();
  const stop=startBtcPolling(null,()=>{},h.env);
  await flush(); assert.equal(h.requests.length,1);
  await h.advance(599999); assert.equal(h.requests.length,1);
  await h.advance(1); assert.equal(h.requests.length,2);
  stop(); assert.equal(h.timers.size,0); assert.equal(h.hasListener(),false);
});
test("hidden page pauses polling, cancels requests and refreshes immediately on resume", async()=> {
  const {startBtcPolling}=await module(); const h=harness();
  let release!:(value:BtcMarketResponse)=>void;
  h.answers.push(()=>new Promise(resolve=>{release=resolve;}));
  const states:Array<{quote:BtcUsdQuote|null}>=[];
  const stop=startBtcPolling(quote(),state=>states.push(state),h.env);
  await flush(); h.hide(); assert.equal(h.requests[0]!.aborted,true);
  await h.advance(1200000); assert.equal(h.requests.length,1);
  h.answers.push(async()=>({quote:quote(BASE+1200000,63000)}));
  h.show(); await flush(); assert.equal(h.requests.length,2);
  release({quote:quote(BASE,61000)}); await flush();
  assert.equal(states.at(-1)!.quote!.priceUsd,63000,"cancelled late response cannot overwrite a new quote");
  stop();
});
test("an initially hidden page waits for visibility before requesting",async()=>{
  const {startBtcPolling}=await module(); const h=harness(); h.hide();
  const stop=startBtcPolling(null,()=>{},h.env); await flush();
  assert.equal(h.requests.length,0); h.show(); await flush(); assert.equal(h.requests.length,1); stop();
});
test("failed, empty and invalid refreshes retain the last valid quote",async()=>{
  const {startBtcPolling}=await module(); const h=harness();
  const states:Array<{quote:BtcUsdQuote|null;failed:boolean}>=[];
  h.answers.push(async()=>{throw new Error('network');});
  const stop=startBtcPolling(quote(),state=>states.push(state),h.env); await flush();
  assert.equal(states.at(-1)!.quote!.priceUsd,62000.5); assert.equal(states.at(-1)!.failed,true);
  h.answers.push(async()=>({quote:null})); await h.advance(600000);
  assert.equal(states.at(-1)!.quote!.priceUsd,62000.5); assert.equal(states.at(-1)!.failed,true);
  h.answers.push(async()=>({quote:{...quote(),currency:'USDT'} as unknown as BtcUsdQuote})); await h.advance(600000);
  assert.equal(states.at(-1)!.quote!.priceUsd,62000.5); assert.equal(states.at(-1)!.failed,true);
  stop();
});
test("successful stale responses and retained quotes age without extra upstream requests",async()=>{
  const {startBtcPolling,btcQuoteDelayed}=await module(); const h=harness();
  const states:Array<{quote:BtcUsdQuote|null;failed:boolean;now:number}>=[];
  h.answers.push(async()=>({quote:quote()}),async()=>({quote:quote()}));
  const stop=startBtcPolling(null,state=>states.push(state),h.env); await flush();
  await h.advance(900001); assert.equal(h.requests.length,2);
  const state=states.at(-1)!; assert.equal(btcQuoteDelayed(state.quote,state.now,state.failed),true);
  stop();
});
test("polling deduplicates visibility refreshes and teardown cancels late results",async()=>{
  const {startBtcPolling}=await module(); const h=harness();
  let release!:(value:BtcMarketResponse)=>void; let changes=0;
  h.answers.push(()=>new Promise(resolve=>{release=resolve;}));
  const stop=startBtcPolling(null,()=>{changes++;},h.env); await flush();
  h.show(); h.show(); assert.equal(h.requests.length,1);
  stop(); const before=changes;
  assert.equal(h.requests[0]!.aborted,true);
  release({quote:quote()}); await flush(); assert.equal(changes,before); assert.equal(h.timers.size,0);
});
