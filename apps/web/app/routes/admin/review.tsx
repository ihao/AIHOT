import { SITE } from "@aihot/industry/site";
import { CATEGORY_LABELS } from "@aihot/contracts/taxonomy";
import { useCallback, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/review";
import { adminGet } from "../../lib/admin.server";
import { useAdminAction } from "../../features/admin/action";
import { AdminPage, Badge, Button, Card, Empty, Field, Input, ReasonDialog, Stat, Textarea, Time } from "../../features/admin/ui";

type QueueRow = {
  id: string; source: string; sourceId: string;
  original: { title: string; url: string; body: string };
  chinese: { title: string; summary: string; translation: string | null };
  category: string | null; score: number | null; grouping: string | null;
  revision: number; discoveredAt: string; fingerprint: string; version: number;
  overrideVersion: number; riskReason: string; priority: number;
};
type Failure = { id: string; title: string; source: string; error: string | null; discovered_at: string };
type Queue = { pendingCount: number; failureCount: number; rows: QueueRow[]; failures: Failure[] };
type Action = "all" | "selected" | "reject" | "edit";

export async function loader({ request }: Route.LoaderArgs) {
  return adminGet<Queue>(request, "/api/admin/review?limit=40");
}
export const meta: Route.MetaFunction = () => [{ title: `夜间审核 · ${SITE.name} 后台` }];
export const headers: Route.HeadersFunction = () => ({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" });

export default function Review({ loaderData }: Route.ComponentProps) {
  const { pendingCount, failureCount, rows, failures } = loaderData;
  const { run, pending } = useAdminAction();
  const [choice, setChoice] = useState<{ row: QueueRow; action: Action } | null>(null);
  const [edit, setEdit] = useState({ title: "", summary: "" });
  const close = useCallback(() => setChoice(null), []);
  const open = (row: QueueRow, action: Action) => {
    setEdit({ title: row.chinese.title, summary: row.chinese.summary });
    setChoice({ row, action });
  };
  const decide = async (reason: string) => {
    if (!choice) return false;
    const { row, action } = choice;
    if (action === "edit") {
      if (!edit.title.trim() || !edit.summary.trim()) return false;
      return !!await run("POST", `/api/admin/content/${encodeURIComponent(row.id)}/override`, {
        fields: { title: edit.title.trim(), summary: edit.summary.trim() },
        version: row.overrideVersion, reason,
      }, { label: `edit:${row.id}`, success: "已保存修正；请在刷新后的队列中重新审核" });
    }
    return !!await run("POST", `/api/admin/content/${encodeURIComponent(row.id)}/review`, {
      status: action === "reject" ? "rejected" : "approved",
      curated: action === "selected", fingerprint: row.fingerprint, version: row.version, reason,
    }, { label: `review:${row.id}`, success: action === "reject" ? "已驳回" : action === "selected" ? "已批准精选" : "已批准进入全部动态" });
  };
  return (
    <AdminPage title="夜间内容审核" subtitle="先核对高风险和已公开内容的修订，再处理普通动态。每条决定对应当前版本；内容变化后必须重新审核。没有固定发布时间。">
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="待审核" value={pendingCount} hint="按风险与修订优先" tone={pendingCount ? "warn" : "ok"} />
        <Stat label="本页展示" value={rows.length} hint="每页最多 40 条" />
        <Stat label="采集或处理失败" value={failureCount} hint="与内容审核分开" tone={failureCount ? "bad" : undefined} />
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <Card key={row.id} className={row.priority ? "ring-amber/30" : ""} title={
            <div className="flex flex-wrap items-center gap-2">
              <span>{row.chinese.title}</span>
              {row.priority > 0 && <Badge tone="warn">优先</Badge>}
            </div>
          } right={<Time at={row.discoveredAt} />}>
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
              <Badge tone={row.priority ? "warn" : "muted"}>{row.riskReason}</Badge>
              <span>{row.source}</span>
              <span>{CATEGORY_LABELS[row.category as keyof typeof CATEGORY_LABELS] ?? row.category ?? "未分类"}</span>
              <span>评分 {row.score ?? "—"}</span>
              <span>原文 v{row.revision} · 审核 v{row.version}</span>
              {row.grouping && <span>事件：{row.grouping}</span>}
            </div>
            <div className="mt-3 grid gap-3 text-[13px] leading-relaxed lg:grid-cols-2">
              <div className="rounded-control bg-bg-sunk p-3">
                <div className="font-medium text-ink">原始材料</div>
                <a href={row.original.url} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-accent underline underline-offset-2">{row.original.title} ↗</a>
                <details className="mt-2"><summary className="cursor-pointer text-ink-3">展开原文证据</summary><p className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words text-ink-2">{row.original.body || "仅有原始标题；请打开原文链接核对。"}</p></details>
              </div>
              <div className="rounded-control bg-bg-sunk p-3">
                <div className="font-medium text-ink">拟发布中文内容</div>
                <p className="mt-1 text-ink-2">{row.chinese.summary}</p>
                {row.chinese.translation && <details className="mt-2"><summary className="cursor-pointer text-ink-3">展开中文译文</summary><p className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words">{row.chinese.translation}</p></details>}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm" tone="primary" onClick={() => open(row, "all")}>批准至全部动态</Button>
              <Button size="sm" onClick={() => open(row, "selected")}>批准并精选</Button>
              <Button size="sm" onClick={() => open(row, "edit")}>先修正</Button>
              <Button size="sm" tone="danger" onClick={() => open(row, "reject")}>驳回</Button>
              <Link className="ml-auto text-[12px] text-accent hover:underline" to={`/admin/content/${encodeURIComponent(row.id)}`}>查看完整处理链路</Link>
            </div>
          </Card>
        ))}
        {!rows.length && <Card><Empty>当前没有可审核内容。采集或处理失败项在下方单独列出。</Empty></Card>}
      </div>
      {failures.length > 0 && <Card className="mt-6" title={`采集或处理失败（最近 ${failures.length} 条）`}>
        <ul className="space-y-2 text-[13px]">{failures.map((f) => <li key={f.id} className="flex flex-wrap gap-2 border-b border-line pb-2 last:border-0"><Link className="text-accent hover:underline" to={`/admin/content/${encodeURIComponent(f.id)}`}>{f.title}</Link><span className="text-ink-3">{f.source}</span><span className="text-hot">{f.error ?? "处理失败"}</span></li>)}</ul>
      </Card>}
      <ReasonDialog open={!!choice} title={choice?.action === "edit" ? "修正后重新排队" : choice?.action === "reject" ? "驳回此内容" : choice?.action === "selected" ? "批准并精选" : "批准进入全部动态"}
        description="审核只对当前指纹与版本有效。若页面已经过期，系统会拒绝并提示刷新。"
        confirmLabel={choice?.action === "edit" ? "保存修正" : "确认决定"} danger={choice?.action === "reject"}
        busy={!!pending} onClose={close} onSubmit={decide}>
        {choice?.action === "edit" && <>
          <Field label="中文标题"><Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
          <Field label="中文摘要"><Textarea rows={5} value={edit.summary} onChange={(e) => setEdit({ ...edit, summary: e.target.value })} /></Field>
        </>}
      </ReasonDialog>
    </AdminPage>
  );
}
