// 站点身份和读者看得到的文案。换成你的行业时，先改这个文件。
// 网页和后端都读它；改完重新构建（docker compose up --build）即可生效。
// 域名不在这里：部署时用环境变量 SITE_URL 设置。

export const SITE = {
  /** 站名：导航、页面标题、分享图、RSS、MCP、后台都用它。 */
  name: "9BTC",
  /**
   * 行业词：拼进默认说法里，比如“Web3 日报”“Web3 动态”。
   */
  subject: "Web3",
  /** 首页的完整标题（浏览器标签、搜索结果）。 */
  homeTitle: "9BTC — Web3 热点与研究",
  /** 一句话介绍：搜索引擎、分享卡片、RSS、llms.txt 会用。 */
  description: "9BTC 聚合 Web3 项目、协议、研究机构与行业媒体等公开信源，提供热点动态与研究摘要，并附原始来源链接，方便读者核对上下文。",
  /** 首页左上角和侧边栏下面的一行小字。 */
  tagline: "Web3 热点与研究",
  /** 界面语言（HTML lang、og:locale）。 */
  locale: "zh-CN",
  /** 默认域名，只在没设置 SITE_URL 时使用。 */
  defaultUrl: "http://localhost:3000",
  /**
   * MCP 工具名的前缀（小写字母、数字、下划线），工具会叫 ninebtc_get_latest、ninebtc_search……
   * 已经有人接入后就不要再改。
   */
  mcpPrefix: "ninebtc",
  /** 对外联系邮箱（选填）：使用规则、llms.txt、响应头里会写。 */
  contactEmail: null as string | null,
  /** 页脚的一行小字（选填）。 */
  footerNote: "9BTC · Web3 热点与研究",
  /** 中国大陆网站的 ICP 备案号（选填），填了就显示在页脚并链接到工信部备案系统。 */
  icp: null as string | null,
  /** 公司主体尚未公示；不要把品牌名当作公司名称写入结构化数据。 */
  organization: null as null | {
    name: string;
    founder?: { name: string; url?: string; description?: string };
  },
  /** 抓取信源时报上的名字（User-Agent 里用），不要冒用别的站。 */
  crawlerName: "9BTCBot",
} as const;

/** 关于页的文案。数字（信源数、收录数、精选数、日报期数）来自站内实时统计，不用写在这里。 */
export const ABOUT = {
  kicker: `关于 ${SITE.name}`,
  /** 大标题：第一行正常颜色，第二行强调色。 */
  headline: ["Web3 热点与研究，", "从可核对的来源开始。"] as [string, string],
  /** 标题下面的一段话。{sources} 会换成实时的信源数。 */
  lead: `${SITE.name} 围绕 Web3 项目、协议、研究机构和行业媒体等 {sources} 个公开信源，整理热点与研究摘要，并保留原文链接，方便继续阅读和核对。`,
  /** 信源河动画下面的四个环节。 */
  steps: {
    collect: "关注 Web3 项目与协议的官方发布、研究机构、行业媒体及其他公开信源。",
    store: "保留报道对应的原始来源链接，便于读者回到原文查看完整信息和上下文。",
    select: "整理与 Web3 相关的热点和研究内容，提供中文摘要，并标注可核对的来源。",
    publish: "页面持续呈现已整理的 Web3 热点与研究摘要；具体内容以各条目的来源和发布时间为准。",
  },
  /**
   * 作者块（选填），null 就不显示。
   * avatarSourceId：一个 X 账号信源的 id，头像取它的（选填）。
   * 二维码在后台“设置”里上传，或者放进 industry/brand/contact/；没有二维码就不显示那张卡片。
   */
  maker: null as null | {
    name: string;
    greeting: string[];
    avatarSourceId?: string | null;
    wechat?: { title: string; note: string };
    feishu?: { title: string; note: string };
  },
  /** 页面底部的版权与下架说明（结尾会接“反馈页”的链接）。 */
  copyright: `${SITE.name} 是聚合摘要和阅读索引，原文版权归各来源所有。如果你是来源方，希望更正、下架或调整展示方式，可以通过`,
} as const;

/** “AI 日报”这类说法：行业词和名词之间，英文词加空格，中文词不加。 */
export function withSubject(noun: string): string {
  return /[A-Za-z0-9]$/.test(SITE.subject) ? `${SITE.subject} ${noun}` : `${SITE.subject}${noun}`;
}
