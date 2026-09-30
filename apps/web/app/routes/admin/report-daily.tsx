import { SITE } from "@aihot/industry/site";
import { useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/report-daily";
import { adminGet } from "../../lib/admin.server";
import { useAdminAction } from "../../features/admin/action";
import { AdminPage, Badge, Button, Card, Empty, ReasonDialog } from "../../features/admin/ui";

interface Entry {
  itemId: string; title: string; summary: string; sourceName: string; sourceUrl: string;
  approvedFingerprint: string;
}
interface Draft {
  active_version_id: number | null;
  draft_id: number | null;
  cutoff: string | null;
  window_start: string | null;
  content: { sections?: Array<{ label: string; items: Entry[] }>; flashes?: Entry[] } | null;
}
interface State { today: string; draft: Draft | null }

export async function loader({ request }: Route.LoaderArgs) {
  return adminGet<State>(request, "/api/admin/reports/daily");
}
export const meta: Route.MetaFunction = () => [{ title: `日报审核 · ${SITE.name} 后台` }];
export const headers: Route.HeadersFunction = () => ({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" });

export default function DailyReportReview({ loaderData }: Route.ComponentProps) {
  const { today, draft } = loaderData;
  const { run, pending } = useAdminAction();
  const [confirm, setConfirm] = useState(false);
  const sections = draft?.content?.sections ?? [];
  const flashes = draft?.content?.flashes ?? [];
  const count = sections.reduce((n, s) => n + s.items.length, 0) + flashes.length;
  return (
    <AdminPage title="日报审核" subtitle="完成内容审核后生成草稿，逐条核对事实与原文，再发布。日报使用实际北京时间出刊日，不设早间自动发布。"
      actions={<Button tone="primary" busy={pending === "generate"} onClick={() => run("POST", "/api/admin/reports/daily/drafts", {}, { label: "generate", success: "草稿已生成，请核对后发布" })}>生成今日草稿</Button>}>
      {draft?.active_version_id && <Card className="mb-5"><Badge tone="ok">今天已发布</Badge> <Link className="ml-2 text-accent underline" to={`/daily/${today}`}>查看公开日报</Link></Card>}
      {!draft?.draft_id ? <Card><Empty>今天还没有草稿。先完成夜间内容审核，再生成草稿。</Empty></Card> : <>
        <Card className="mb-5" title={`${today} 草稿 · ${count} 条`}>
          <p className="text-[13px] text-ink-3">时间窗口：{draft.window_start ? new Date(draft.window_start).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }) : "—"} 至 {draft.cutoff ? new Date(draft.cutoff).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }) : "—"}</p>
          <p className="mt-2 text-[13px] text-ink-3">发布时会重新核对整批候选内容及每条审核版本；期间有变化需重新生成。</p>
        </Card>
        {sections.map((section) => <Card className="mb-4" key={section.label} title={section.label}>
          <ul className="space-y-4">{section.items.map((item) => <li key={item.itemId} className="border-b border-line pb-3 last:border-0 last:pb-0">
            <div className="font-medium text-ink">{item.title}</div>
            <p className="mt-1 text-[13px] text-ink-2">{item.summary}</p>
            <div className="mt-1 flex gap-3 text-[12px]"><span>{item.sourceName}</span><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline">核对原文 ↗</a><Link to={`/admin/content/${item.itemId}`} className="text-accent underline">处理链路</Link></div>
          </li>)}</ul>
        </Card>)}
        {!!flashes.length && <Card className="mb-4" title="简讯"><ul className="space-y-2">{flashes.map((item) => <li key={item.itemId}><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline">{item.title} ↗</a></li>)}</ul></Card>}
        {!draft.active_version_id && <div className="flex justify-end"><Button tone="primary" disabled={!count} onClick={() => setConfirm(true)}>确认发布这版草稿</Button></div>}
      </>}
      <ReasonDialog open={confirm} title="发布今日日报" description="请确认每条标题、摘要和原文对应；系统会再次核对候选集和审核版本。" confirmLabel="发布日报"
        busy={pending === "publish"} onClose={() => setConfirm(false)} onSubmit={async (reason) => {
          if (!draft?.draft_id) return false;
          return !!await run("POST", `/api/admin/reports/daily/drafts/${draft.draft_id}/publish`, { reason }, { label: "publish", success: "日报已发布" });
        }} />
    </AdminPage>
  );
}
