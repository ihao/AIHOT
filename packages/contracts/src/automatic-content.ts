export const AUTOMATIC_CONTENT_LABELS = {
  processing: '自动处理中', published: '已发布', unpublished: '自动未发布',
  paused: '暂停归档', failed: '处理故障', manual: '人工干预记录',
} as const;
export type AutomaticContentStatus = keyof typeof AUTOMATIC_CONTENT_LABELS;
export type AutomaticContentView = AutomaticContentStatus | 'all';
export type AutomaticContentCounts = Record<AutomaticContentStatus, number> & { budgetWait: number };
export interface AutomaticContentRow {
  id: string; title: string; summary: string | null; source: string; sourceId: string; url: string;
  revision: number; discoveredAt: Date | string; status: AutomaticContentStatus; reasons: string[];
  retryAt: Date | string | null; verificationStatus: string | null; verificationCount: number;
  evidenceCount: number; selected: boolean;
}
export interface AutomaticContentOverview {
  counts: AutomaticContentCounts; view: AutomaticContentView; rows: AutomaticContentRow[];
}

/** Provider errors are deliberately reduced to codes before reaching the admin response. */
export function automaticReasonCode(reason: string): string {
  if (/Budget .* exhausted/.test(reason)) return 'budget_wait';
  if (/ReceiptBusy/.test(reason)) return 'receipt_busy';
  if (/ReceiptUnknown|outcome unknown/i.test(reason)) return 'receipt_unknown';
  if (/ModelOutput|invalid.*json/i.test(reason)) return 'model_output_invalid';
  return Object.hasOwn(REASON_LABELS,reason) || /^claim_\d+_(?:supported|unsupported|contradicted|needs_evidence|evidence_missing|quote_invalid|primary_evidence_missing)$/.test(reason) ||
    /^check_(?:claimsComplete|chineseCopyFaithful|subject|numbers|units|time|chain|stage|attribution|noSpeculationAsFact|notMarketing)_failed$/.test(reason) ||
    /^verification_(?:supported|needs_evidence|contradicted|missing_or_invalid)$/.test(reason) ? reason : 'runtime_error';
}
const REASON_LABELS:Record<string,string> = {
    source_disabled:'信源已暂停，历史材料保留', source_not_editorial:'该来源不参与公开编辑',
    source_not_authorized:'来源未获自动发布授权', source_paused:'来源安全保护，稍后自动恢复',
    no_new_primary_evidence:'未取得新增一手证据，已自动结束', primary_evidence_missing:'关键主张缺少一手证据',
    verification_request_limit:'已达到核验调用上限', verification_rejected:'证据核验未通过',
    input_changed_or_manual_hold:'原文、配置或人工决定变化，旧核验已失效', approval_invalidated:'旧核验与当前内容不匹配，未公开',
    publication_scheduled:'已核验，等待自动发布时间',
    manual_hold:'保留人工更正或发布决定，可选复核', not_relevant:'与本站主题无关', relevance_unknown:'相关性尚不能确认',
    body_unreadable:'没有可用正文', copy_incomplete:'中文内容尚不完整', processing_failed:'处理故障已结束自动重试',
    processing:'系统正在自动处理', automatic_unpublished:'未满足自动公开条件，已留档',
    budget_wait:'等待额度释放后自动重试', receipt_busy:'已有请求在处理，稍后自动恢复',
    receipt_unknown:'请求结果未知，系统保留回执防止重复付费', model_output_invalid:'模型输出无效', runtime_error:'处理故障，详见内部运行记录',
    'freshness:expired':'原文超过自动处理时效，已留档', 'freshness:undated':'没有可靠原文日期，已留档',
    'freshness:future':'原文日期超出允许范围，已留档', copy_amount_conflict:'摘要金额与材料不一致',
    marketing:'推广内容未通过公开规则', scores_invalid:'评分数据不完整', original_unreadable:'原文正文不可核对',
    prefilter_not_pass:'相关性未明确通过',score_threshold_missing:'来源精选门槛未配置',scores_incomplete:'评分未满足完整性或稳定性要求',
    material_ids_not_unique:'证据材料标识重复',
  };
export function automaticReasonLabel(reason: string): string {
  const code=automaticReasonCode(reason);
  if (Object.hasOwn(REASON_LABELS,code)) return REASON_LABELS[code];
  if (code.endsWith('_primary_evidence_missing')) return REASON_LABELS.primary_evidence_missing;
  if (code.startsWith('verification_') || code.startsWith('check_') || code.startsWith('claim_')) return REASON_LABELS.verification_rejected;
  return '未满足自动公开条件；可查看核验记录';
}
