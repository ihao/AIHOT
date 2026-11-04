// A provider credential can stop every model at once. Keep the shared stop separate from
// article failures and local request-rate budgets; successful receipts are reused by the caller.
import { sql, type Tx } from '../db.ts';
import { sha256 } from '../lib/ids.ts';
import { BudgetExceededError } from './model-cost.ts';

export class ProviderBudgetExceededError extends BudgetExceededError {
  readonly reason = 'provider_budget';
  readonly window = 'provider_budget';
  readonly actualHttpRejection: boolean;
  constructor(service: string, actualHttpRejection = false) {
    super(service,'provider_budget',3600);
    this.name='ProviderBudgetExceededError';
    this.actualHttpRejection=actualHttpRejection;
    this.message+='：供应商预算已用尽并暂停模型服务，不是文章失败或每分钟限流；恢复供应商预算后，冷却到期仅探测一次。';
  }
}

/** The key is shared by all models using this endpoint/credential and contains neither value. */
export function providerCapacityKey(baseUrl: string, apiKey: string): string {
  let endpoint=baseUrl.trim().replace(/\/+$/u,'');
  try {
    const url=new URL(endpoint);url.hash='';url.pathname=url.pathname.replace(/\/+$/u,'')||'/';
    endpoint=url.href;
  } catch { /* Invalid configuration still gets an opaque identity, never a credential error. */ }
  return `provider.capacity.${sha256(JSON.stringify([endpoint,apiKey]))}`;
}

type CapacityState = {version:1;state:'blocked'|'probe';until:string;service:string};
function validTimestamp(value: unknown): value is string {
  if(typeof value!=='string')return false;
  const parts=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/u.exec(value);
  if(!parts)return false;
  const year=Number(parts[1]),month=Number(parts[2]),day=Number(parts[3]);
  const hour=Number(parts[4]),minute=Number(parts[5]),second=Number(parts[6]);
  const days=[31,year%4===0&&(year%100!==0||year%400===0)?29:28,31,30,31,30,31,31,30,31,30,31];
  return year>0&&month>=1&&month<=12&&day>=1&&day<=(days[month-1]??0)
    &&hour<=23&&minute<=59&&second<=59&&Number.isFinite(Date.parse(value));
}
function validState(value: unknown): value is CapacityState {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const v=value as Record<string,unknown>;
  return v.version===1&&(v.state==='blocked'||v.state==='probe')&&validTimestamp(v.until)
    &&typeof v.service==='string'&&v.service.trim().length>0;
}

/** Call in the atomic paid-request claim after exact success reuse and before a new attempt.
 * The caller holds the global model lock. The row lock also serializes expired probes. */
export async function checkProviderCapacity(tx: Tx, key: string, service: string): Promise<void> {
  const [row]=await tx<{value:unknown}[]>`SELECT value FROM settings WHERE key=${key} FOR UPDATE`;
  if(!row)return;
  if(!validState(row.value))throw new ProviderBudgetExceededError(service);
  const [time]=await tx<{active:boolean}[]>`SELECT ${row.value.until}::timestamptz>clock_timestamp() AS active`;
  if(time!.active)throw new ProviderBudgetExceededError(service);
  await tx`UPDATE settings SET value=jsonb_build_object('version',1,'state','probe','until',clock_timestamp()+interval '1 minute','service',${service}::text),
    updated_at=clock_timestamp() WHERE key=${key}`;
}

/** Only an explicit provider HTTP 429 budget code invokes this, outside the claim transaction. */
export async function recordProviderBudgetStop(key: string, service: string): Promise<void> {
  await sql`INSERT INTO settings(key,value) VALUES(${key},
    jsonb_build_object('version',1,'state','blocked','until',clock_timestamp()+interval '1 hour','service',${service}::text))
    ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=clock_timestamp()`;
}
/** A late ordinary success must never erase a newer provider-budget stop. */
export async function clearProviderProbe(key: string): Promise<void> {
  await sql.begin(async tx=>{
    const [row]=await tx<{value:unknown}[]>`SELECT value FROM settings WHERE key=${key} FOR UPDATE`;
    if(row&&validState(row.value)&&row.value.state==='probe')await tx`DELETE FROM settings WHERE key=${key}`;
  });
}
