// Shared admin vocabulary.
export const KIND_LABEL: Record<string, string> = { rss: "RSS", web_list: "网页列表", json_list: "JSON", x_search: "X", mp_account: "公众号", external: "外部上报" };
export const MODE_LABEL: Record<string, string> = { editorial: "精选", hot_signal: "氛围", isolated: "隔离" };
export const HEALTH_LABEL: Record<string, string> = { ok: "正常", degraded: "不稳定", failing: "失败", paused: "已暂停", unknown: "未检查" };
export const VISIBILITY_LABEL: Record<string, string> = { public: "公开", "summary-only": "仅摘要", withdrawn: "未公开" };

export function processingErrorLabel(error: string): string {
  const match = /^Budget for ([a-zA-Z0-9_-]+) exhausted \((minute|hour|day|stopped)\)$/.exec(error);
  if (!match) return error;
  const service = match[1] === "dashscope" ? "百炼" : match[1];
  const window: Record<string, string> = { minute: "近 1 分钟", hour: "近 1 小时", day: "滚动 24 小时" };
  return match[2] === "stopped"
    ? `${service} 调用额度设为 0，等待管理员调整上限。`
    : `${service} ${window[match[2]!]}调用额度已满，等待自动重试。可在设置中调整请求上限。`;
}
export const FEEDBACK_STATUS: Record<string, string> = { new: "新反馈", triaged: "处理中", replied: "已回复", resolved: "已解决", spam: "垃圾信息" };
export const TIER_LABEL: Record<string, string> = { T1: "T1", T1_5: "T1.5", T2: "T2", EXCLUDE_MP: "排除公众号" };
