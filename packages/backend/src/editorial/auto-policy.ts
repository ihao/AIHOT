// Narrow daytime publication lane. It is deliberately deterministic and defaults
// to pending whenever source identity, model output or material is incomplete.
export interface AutoPolicyInput {
  source: {
    enabled: boolean; tier: string; kind: string; participationMode: string;
    firstParty: boolean; ownerEntityId: string | null; feedUrl: string | null;
    autoPublicEnabled: boolean;
  };
  article: { url: string; title: string; body: string; bodyStatus?: string };
  analysis: {
    relevance: string; itemType?: string | null; authorRole?: string | null;
    score: number | null; titleZh: string; summaryZh: string;
  };
}

export interface AutoPolicyDecision { admit: boolean; reason: string }

const RISK = /\b(?:cve-\d+|exploit|hack(?:ed|ing)?|breach|vulnerabilit(?:y|ies)|attack|stolen|drain(?:ed|ing)?|loss(?:es)?|recover(?:y|ed)?|sec|cftc|regulat(?:ion|or|ory)|lawsuit|sanction|enforcement|court|governance|propos(?:al|ed|e)|vote|planned?|upcoming|mainnet activation|hard ?fork|consensus|stablecoin|yield|apy|apr|profit|return|airdrop|token sale|fundrais(?:e|ing)|invest(?:ment|or)?|price target)\b|漏洞|攻击|被盗|损失|追回|安全事件|监管|起诉|制裁|法院|治理|提案|投票|草案|计划|拟于|主网上线|硬分叉|共识|稳定币|收益|年化|融资|空投|代币销售|投资建议|目标价/i;
const RELEASE = /\b(?:released?|software update|version|client update|changelog)\b|软件版本|客户端版本|版本发布|例行更新/i;
const VERSION = /\bv?\d+\.\d+(?:\.\d+)?(?:\.\d+)?\b/i;

function matchingHost(feed: string | null, article: string): boolean {
  if (!feed) return false;
  try {
    const f = new URL(feed);
    const a = new URL(article);
    return f.protocol === "https:" && a.protocol === "https:" && f.hostname.toLowerCase() === a.hostname.toLowerCase();
  } catch { return false; }
}

export function evaluateAutoPolicy(input: AutoPolicyInput): AutoPolicyDecision {
  const { source, article, analysis } = input;
  if (!source.autoPublicEnabled) return { admit: false, reason: "信源未被单独允许自动发布" };
  if (!source.enabled || source.kind !== "rss" || source.participationMode !== "editorial" ||
      source.tier !== "T1" || !source.firstParty || !source.ownerEntityId?.trim()) {
    return { admit: false, reason: "信源不是已核实的一手官方 RSS" };
  }
  if (!matchingHost(source.feedUrl, article.url)) return { admit: false, reason: "原文域名与官方 RSS 域名不一致" };
  if (article.bodyStatus !== "ok" || article.body.trim().length < 80) {
    return { admit: false, reason: "原始正文不足，不能自动核对例行版本发布" };
  }
  if (analysis.relevance !== "pass" || analysis.itemType !== "protocol_upgrade" || analysis.authorRole !== "principal" ||
      analysis.score === null || !Number.isFinite(analysis.score) || analysis.score > 55) {
    return { admit: false, reason: "内容类型、作者角色或注意力分数不属于例行发布范围" };
  }
  if (!/[\u3400-\u9fff]/.test(analysis.titleZh) ||
      (analysis.summaryZh.match(/[\u3400-\u9fff]/g) ?? []).length < 12) {
    return { admit: false, reason: "缺少可靠的中文标题或摘要" };
  }
  const original = [article.title, article.body].join(" ");
  const material = [original, analysis.titleZh, analysis.summaryZh].join(" ");
  if (RISK.test(material)) return { admit: false, reason: "材料含安全、监管、争议、资金或重大治理等人工审核信号" };
  if (!RELEASE.test(original) || !VERSION.test(original)) return { admit: false, reason: "原始材料缺少明确的软件版本与发布证据" };
  return { admit: true, reason: "一手官方例行软件版本发布；仅进入全部动态" };
}
