import { CATEGORY_KEYS, CATEGORY_LABELS, CHANNEL_LABELS, FEED_TOPIC_TAGS, type CategoryKey, type ChannelKey } from "@aihot/contracts/taxonomy";

/** Same page with some query parameters changed (paging state dropped). */
export function hrefWith(base: string, params: URLSearchParams, patch: Record<string, string | null>) {
  const sp = new URLSearchParams(params);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === "") sp.delete(k);
    else sp.set(k, v);
  }
  sp.delete("page");
  sp.delete("cursor");
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}

/**
 * The feed's one choice: none, 一手, a category or a configured topic. Other tag links remain
 * independent filters, as on the engine's feed. Older 资讯 / X links still filter.
 */
export function filterOptions(base: string, params: URLSearchParams, noneLabel: string) {
  const resetTopic: Record<string, string | null> = FEED_TOPIC_TAGS.some(topic => topic === params.get("tag")) ? { tag: null } : {};
  return [
    { key: "all", label: noneLabel, to: hrefWith(base, params, { category: null, channel: null, ...resetTopic }) },
    { key: "firstParty", label: CHANNEL_LABELS.firstParty, to: hrefWith(base, params, { category: null, channel: "firstParty", ...resetTopic }) },
    ...CATEGORY_KEYS.map((k) => ({ key: k, label: CATEGORY_LABELS[k], to: hrefWith(base, params, { category: k, channel: null, ...resetTopic }) })),
    ...FEED_TOPIC_TAGS.map(tag => ({ key: `tag:${tag}`, label: tag, to: hrefWith(base, params, { category: null, channel: null, tag }) })),
  ];
}

export function filterKey(category: CategoryKey | null, channel: ChannelKey, tag: string | null = null): string {
  if (tag && FEED_TOPIC_TAGS.some(topic => topic === tag)) return `tag:${tag}`;
  return channel === "firstParty" ? "firstParty" : (category ?? "all");
}
