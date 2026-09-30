// 9BTC 的分类、标签和主体名录。分类 key 与专题 slug 会进入公开网址，上线后保持稳定。
// 模型只在有原文或明确来源证据时认定主体；BTC、ETH 等资产代码不等于项目或机构。

export const CATEGORIES = [
  { key: "infrastructure", label: "公链与基础设施", section: "公链与基础设施", guide: "公链协议升级、网络运行、扩容、跨链及开发者基础设施的实质变化" },
  { key: "defi", label: "DeFi", section: "DeFi", guide: "去中心化金融协议的产品、机制、流动性与风险参数变化" },
  { key: "stablecoin-rwa", label: "稳定币与 RWA", section: "稳定币与 RWA", guide: "稳定币发行、储备、赎回，以及真实世界资产上链的可核实进展" },
  { key: "security", label: "安全", section: "安全", guide: "漏洞、攻击、资产损失、审计发现与处置进展；区分已证实事件和传闻" },
  { key: "policy", label: "政策与监管", section: "政策与监管", guide: "监管机构正式文件、执法、立法与政策进展；区分提案和生效规则" },
  { key: "industry", label: "项目与商业", section: "项目与商业", guide: "项目治理、组织经营、合作、融资与商业模式变化" },
  { key: "research", label: "研究与数据", section: "研究与数据", guide: "链上数据、技术研究、市场分析与有方法和来源的研究报告" },
] as const;

/** 内容理解步骤的类型；评分提示词需要使用同一组类型。 */
export const ITEM_TYPES = ["protocol_upgrade", "defi_product_change", "stablecoin_rwa_event", "security_incident", "policy_event", "governance_business_change", "research_analysis"] as const;

/** 每篇资料的首个标签必须是一个分类标签。 */
export const CATEGORY_TAGS = ["公链/基础设施", "DeFi/产品", "稳定币/RWA", "安全事件", "政策/监管", "项目/商业", "研究/数据"] as const;
export const TOPIC_TAGS = ["公链", "协议升级", "扩容", "跨链", "DeFi", "借贷", "去中心化交易", "稳定币", "RWA", "安全", "治理", "链上数据", "研究报告"] as const;
export const ENTITY_TAGS = ["Bitcoin", "Ethereum", "Solana", "Uniswap", "Aave", "Chainlink", "SEC", "CFTC"] as const;

/** 近义词只做明确的词汇归一；资产代码不会映射到项目主体。 */
export const TAG_SYNONYMS: Readonly<Record<string, string>> = {
  "基础设施": "公链/基础设施", "协议更新": "协议升级", "Layer 2": "扩容", "L2": "扩容",
  "去中心化金融": "DeFi", "DEX": "去中心化交易", "去中心化交易所": "去中心化交易",
  "稳定币发行": "稳定币/RWA", "真实世界资产": "RWA", "代币化资产": "RWA",
  "漏洞": "安全事件", "攻击": "安全事件", "被盗": "安全事件",
  "监管": "政策/监管", "政策": "政策/监管", "立法": "政策/监管", "执法": "政策/监管",
  "项目动态": "项目/商业", "融资": "项目/商业", "合作": "项目/商业", "治理提案": "治理",
  "数据分析": "研究/数据", "链上分析": "链上数据", "研究": "研究/数据",
};

export const CATEGORY_BY_ITEM_TYPE: Readonly<Record<string, string>> = {
  protocol_upgrade: "公链/基础设施",
  defi_product_change: "DeFi/产品",
  stablecoin_rwa_event: "稳定币/RWA",
  security_incident: "安全事件",
  policy_event: "政策/监管",
  governance_business_change: "项目/商业",
  research_analysis: "研究/数据",
};

/** 项目、网络与机构；BTC、ETH 是资产，不是这里的别名。 */
export const ENTITIES: Record<string, { name: string; displayTag: string | null; aliases: string[] }> = {
  bitcoin: { name: "Bitcoin", displayTag: "Bitcoin", aliases: ["Bitcoin", "比特币", "Bitcoin network", "比特币网络"] },
  ethereum: { name: "Ethereum", displayTag: "Ethereum", aliases: ["Ethereum", "以太坊", "Ethereum network", "以太坊网络"] },
  solana: { name: "Solana", displayTag: "Solana", aliases: ["Solana", "索拉纳", "Solana network"] },
  uniswap: { name: "Uniswap", displayTag: "Uniswap", aliases: ["Uniswap"] },
  aave: { name: "Aave", displayTag: "Aave", aliases: ["Aave"] },
  chainlink: { name: "Chainlink", displayTag: "Chainlink", aliases: ["Chainlink"] },
  sec: { name: "美国证券交易委员会 SEC", displayTag: "SEC", aliases: ["SEC", "U.S. Securities and Exchange Commission", "美国证券交易委员会"] },
  cftc: { name: "美国商品期货交易委员会 CFTC", displayTag: "CFTC", aliases: ["CFTC", "U.S. Commodity Futures Trading Commission", "美国商品期货交易委员会"] },
};

/** 标题摘要的身份保护只认明确名称，不用 BTC、ETH、SOL 或代币符号推断主体。 */
export const IDENTITY_LEXICON: ReadonlyArray<{ id: string; name: string; patterns: RegExp[] }> = [
  { id: "bitcoin", name: "Bitcoin", patterns: [/\bBitcoin\b|比特币/i] },
  { id: "ethereum", name: "Ethereum", patterns: [/\bEthereum\b|以太坊/i] },
  { id: "solana", name: "Solana", patterns: [/\bSolana\b|索拉纳/i] },
  { id: "uniswap", name: "Uniswap", patterns: [/\bUniswap\b/i] },
  { id: "aave", name: "Aave", patterns: [/\bAave\b/i] },
  { id: "chainlink", name: "Chainlink", patterns: [/\bChainlink\b/i] },
  { id: "sec", name: "SEC", patterns: [/\bSEC\b|U\.S\. Securities and Exchange Commission|美国证券交易委员会/] },
  { id: "cftc", name: "CFTC", patterns: [/\bCFTC\b|U\.S\. Commodity Futures Trading Commission|美国商品期货交易委员会/] },
];

/** 官方项目和监管机构域名可证明发布主体；网络官网不等于资产发行方。 */
export const PUBLISHER_DOMAINS: ReadonlyArray<{ entityId: string; domains: readonly string[] }> = [
  { entityId: "uniswap", domains: ["uniswap.org"] },
  { entityId: "aave", domains: ["aave.com"] },
  { entityId: "chainlink", domains: ["chain.link"] },
  { entityId: "sec", domains: ["sec.gov"] },
  { entityId: "cftc", domains: ["cftc.gov"] },
];

export const IDENTITY_CONTEXT_ALIASES: ReadonlyArray<{ entityId: string; pattern: RegExp }> = [];
