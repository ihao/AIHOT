import { sql } from '../db.ts';
import { AUTOMATIC_RULE_VERSION, publicationAuthorityCondition } from '../editorial/automatic-verification.ts';
import { listedCondition } from '../publication/items.ts';
import { STALE_ON_DISCOVERY_MS, FUTURE_TOLERANCE_MS } from '../content/materials.ts';
import { AUTOMATIC_CONTENT_LABELS, automaticReasonCode, type AutomaticContentOverview, type AutomaticContentStatus, type AutomaticContentView } from '@aihot/contracts/automatic-content';

/** This is an operational view, never a publication grant or a human review proposal. */
export async function automaticContentOverview(limit:number,sourceId?:string,requestedView?:string):Promise<AutomaticContentOverview> {
  const view:AutomaticContentView=requestedView==='all' || requestedView && Object.hasOwn(AUTOMATIC_CONTENT_LABELS,requestedView)
    ? requestedView as AutomaticContentView : 'all';
  return sql.begin(async tx=>{
    await tx`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`;
    const [clock]=await tx<{now:Date}[]>`SELECT now() AS now`;
    const now=clock!.now;
    const scheduled=sql`p.visibility='public' AND p.selected AND p.visible_after>${now} AND ${publicationAuthorityCondition('p')}`;
    const fresh=sql`a.published_at BETWEEN ${new Date(now.getTime()-STALE_ON_DISCOVERY_MS)} AND ${new Date(now.getTime()+FUTURE_TOLERANCE_MS)}`;
    const classified=sql`WITH classified AS (
      SELECT a.id,coalesce(o.fields->>'title',an.title_zh,a.title) AS title,coalesce(o.fields->>'summary',an.summary_zh) AS summary,
        s.name AS source,s.id AS source_id,a.url,a.revision,a.discovered_at,
        a.processing_state,a.processing_error,an.relevance,a.body_status,an.title_zh,an.summary_zh,
        s.enabled,s.participation_mode,sp.enabled AS auto_enabled,
        av.status AS verification_status,av.reasons,coalesce(av.failures,0) AS verification_failures,
        coalesce(av.verification_count,0) AS verification_count,coalesce(jsonb_array_length(av.materials),0) AS evidence_count,
        coalesce(av.retry_at,a.processing_retry_at) AS retry_at,coalesce(p.selected,false) AS selected,
        (${scheduled}) AS publication_scheduled,p.visible_after,
        CASE WHEN a.published_at IS NULL THEN 'undated' WHEN a.published_at<${new Date(now.getTime()-STALE_ON_DISCOVERY_MS)} THEN 'expired'
          WHEN a.published_at>${new Date(now.getTime()+FUTURE_TOLERANCE_MS)} THEN 'future' END AS freshness,
        CASE WHEN NOT s.enabled OR s.participation_mode<>'editorial' OR NOT coalesce(sp.enabled,false) THEN 'paused'
          WHEN ${listedCondition(now)} THEN 'published'
          WHEN ${scheduled} THEN 'processing'
          WHEN o.article_id IS NOT NULL OR EXISTS(SELECT 1 FROM audit_log l WHERE l.subject='content:'||a.id AND l.action IN ('content.review','content.curation')) THEN 'manual'
          WHEN a.processing_state='failed' OR (av.status='rejected' AND av.failures>0) THEN 'failed'
          WHEN ${fresh} AND (a.processing_state='new' OR (av.status IN ('queued','running','waiting')
            AND av.automatic_rule_version=${AUTOMATIC_RULE_VERSION} AND av.analysis_id=an.id AND av.source_policy_version=sp.version)) THEN 'processing'
          ELSE 'unpublished' END AS status
      FROM articles a JOIN sources s ON s.id=a.source_id
      LEFT JOIN source_auto_public_policies sp ON sp.source_id=s.id
      LEFT JOIN LATERAL(SELECT * FROM analyses WHERE article_id=a.id AND input_revision=a.revision ORDER BY id DESC LIMIT 1) an ON true
      LEFT JOIN LATERAL(SELECT * FROM automatic_verifications WHERE article_id=a.id AND article_revision=a.revision
        ORDER BY (automatic_rule_version=${AUTOMATIC_RULE_VERSION}) DESC,id DESC LIMIT 1) av ON true
      LEFT JOIN publications p ON p.article_id=a.id LEFT JOIN editorial_overrides o ON o.article_id=a.id
      WHERE (${sourceId??null}::text IS NULL OR s.id=${sourceId??null})
    )`;
    const totals=await tx<{status:AutomaticContentStatus;n:number;budget_wait:number}[]>`${classified}
      SELECT status,count(*)::int n,count(*) FILTER(WHERE status='processing' AND
        (processing_error LIKE '%Budget % exhausted%' OR reasons::text LIKE '%Budget % exhausted%'))::int budget_wait
      FROM classified GROUP BY status`;
    const counts={processing:0,published:0,unpublished:0,paused:0,failed:0,manual:0,budgetWait:0};
    for(const t of totals) {counts[t.status]=t.n;counts.budgetWait+=t.budget_wait;}
    const rows=await tx`${classified} SELECT * FROM classified WHERE (${view}='all' OR status=${view})
      ORDER BY CASE status WHEN 'processing' THEN 0 WHEN 'failed' THEN 1 WHEN 'unpublished' THEN 2 WHEN 'manual' THEN 3 WHEN 'paused' THEN 4 ELSE 5 END,
        discovered_at DESC,id LIMIT ${limit}`;
    return {counts,view,rows:rows.map(r=>{
      let reasons:string[];
      if(r.status==='paused') reasons=[!r.enabled?'source_disabled':r.participation_mode!=='editorial'?'source_not_editorial':'source_not_authorized'];
      else if(r.status==='published') reasons=[];
      else if(r.publication_scheduled) reasons=['publication_scheduled'];
      else if(r.status==='manual') reasons=['manual_hold'];
      else if(r.verification_status==='rejected' || r.verification_status==='stale') reasons=r.reasons.length?r.reasons.map(automaticReasonCode):['verification_rejected'];
      else if(r.status==='failed') reasons=['processing_failed'];
      else if(r.status==='processing') reasons=r.reasons?.length?r.reasons.map(automaticReasonCode):r.processing_error?[automaticReasonCode(r.processing_error)]:['processing'];
      else if(r.verification_status==='accepted') reasons=['approval_invalidated'];
      else if(r.freshness) reasons=[`freshness:${r.freshness}`];
      else if(r.relevance==='fail') reasons=['not_relevant'];
      else if(r.relevance==='unknown') reasons=['relevance_unknown'];
      else if(r.body_status==='failed') reasons=['body_unreadable'];
      else if(!r.title_zh || !r.summary_zh) reasons=['copy_incomplete'];
      else reasons=['automatic_unpublished'];
      return {id:r.id,title:r.title,summary:r.summary,source:r.source,sourceId:r.source_id,url:r.url,revision:r.revision,
        discoveredAt:r.discovered_at,status:r.status as AutomaticContentStatus,reasons,
        retryAt:r.status==='processing'?(r.publication_scheduled?r.visible_after:r.retry_at):null,verificationStatus:r.verification_status,verificationCount:r.verification_count,
        evidenceCount:r.evidence_count,selected:r.status==='published' && r.selected};
    })};
  });
}
