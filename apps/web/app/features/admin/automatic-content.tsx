import { Link, useSearchParams } from 'react-router';
import { AUTOMATIC_CONTENT_LABELS, automaticReasonLabel, type AutomaticContentOverview, type AutomaticContentView } from '@aihot/contracts/automatic-content';
import { Badge, Card, Empty, Stat, Time } from './ui';

export function AutomaticContent({overview}:{overview:AutomaticContentOverview}) {
  const [params]=useSearchParams();
  const to=(view:AutomaticContentView)=>{const next=new URLSearchParams(params);next.set('view',view);return `?${next}`;};
  return <>
    <p className="mb-4 text-[13px] leading-relaxed text-ink-3">合格内容自动发布；证据不足、处理失败或暂停来源自动留档。无需逐条人工批准。需要更正时，可进入内容详情查看证据和处理记录。</p>
    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(AUTOMATIC_CONTENT_LABELS).map(([status,label])=><Link key={status} to={to(status as AutomaticContentView)}>
        <Stat label={label} value={overview.counts[status as keyof typeof AUTOMATIC_CONTENT_LABELS]}
          hint={status==='processing'?`其中 ${overview.counts.budgetWait} 条等待调用额度`:status==='manual'?'保留人工决定，可选纠正':status==='failed'?'已结束重试，记录保留':'查看最近记录'}
          tone={status==='published'?'ok':undefined}/>
      </Link>)}
    </div>
    <div className="mb-4 flex flex-wrap items-center gap-3 text-[13px]">
      <Link to={to('all')} className="text-accent hover:underline">全部状态</Link>
      <span className="text-ink-3">当前：{overview.view==='all'?'全部状态':AUTOMATIC_CONTENT_LABELS[overview.view]} · 最近 {overview.rows.length} 条</span>
      <Link to="/admin/content" className="ml-auto text-accent hover:underline">搜索历史内容</Link>
      <Link to={to('all').replace('view=all','view=intervention')} className="text-accent hover:underline">人工复核（可选）</Link>
    </div>
    <div className="space-y-3">{overview.rows.map(row=><Card key={row.id} title={row.title} right={<Time at={String(row.discoveredAt)}/>}>
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
        <Badge tone={row.status==='published'?'ok':'muted'}>{AUTOMATIC_CONTENT_LABELS[row.status]}</Badge>
        <span>{row.source} · 原文 v{row.revision}</span>
        {row.selected && <Badge tone="accent">精选</Badge>}
        {row.verificationStatus && <span>核验 {row.verificationCount} 次 · 证据材料 {row.evidenceCount} 份</span>}
      </div>
      {row.summary && <p className="mt-3 text-[13px] leading-relaxed text-ink-2">{row.summary}</p>}
      {row.reasons.length>0 && <p className="mt-2 text-[13px] text-ink-3">{row.reasons.map(automaticReasonLabel).join('；')}</p>}
      {row.retryAt && <p className="mt-2 text-[12px] text-ink-3">{row.reasons.includes('publication_scheduled')?'自动发布时间':'下次自动重试'} <Time at={String(row.retryAt)}/></p>}
      <div className="mt-3 flex flex-wrap gap-4 text-[12px]">
        <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">查看原文 ↗</a>
        <Link to={`/admin/content/${encodeURIComponent(row.id)}`} className="text-accent hover:underline">查看证据与完整处理链路</Link>
      </div>
    </Card>)}
      {!overview.rows.length && <Card><Empty>当前分类没有内容。系统会持续自动处理新材料。</Empty></Card>}
    </div>
  </>;
}
