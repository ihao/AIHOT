import assert from "node:assert/strict";
import { test } from "node:test";
import { filterKey, filterOptions, hrefWith } from "../app/lib/feed-filters.ts";

test("prediction market appears on both feed scopes and clears other filter dimensions", () => {
  for (const base of ["/", "/all"]) {
    const options = filterOptions(base, new URLSearchParams("category=infrastructure&channel=firstParty&q=odds&page=3&cursor=old"), "全部");
    const prediction = options.find(o => o.key === "tag:预测市场")!;
    assert.ok(prediction);
    const url = new URL(prediction.to, "https://example.com");
    assert.equal(url.pathname, base);
    assert.equal(url.searchParams.get("tag"), "预测市场");
    assert.equal(url.searchParams.get("q"), "odds");
    for (const key of ["category", "channel", "page", "cursor"]) assert.equal(url.searchParams.has(key), false);
    assert.equal(filterKey(null, "all", "预测市场"), prediction.key);
  }
});

test("changing categories clears prediction tag and all clears both", () => {
  const params = new URLSearchParams("tag=预测市场&q=market");
  const options = filterOptions("/all", params, "全部");
  const category = options.find(o => o.key !== "all" && o.key !== "firstParty" && !o.key.startsWith("tag:"))!;
  assert.equal(new URL(category.to, "https://example.com").searchParams.has("tag"), false);
  const all = new URL(options[0].to, "https://example.com");
  assert.deepEqual([...all.searchParams], [["q", "market"]]);
});

test("selected to all and search navigation preserve prediction market", () => {
  const href = hrefWith("/all", new URLSearchParams("tag=预测市场&q=odds&page=2"), { tab: null, search: null });
  const url = new URL(href, "https://example.com");
  assert.equal(url.searchParams.get("tag"), "预测市场");
  assert.equal(url.searchParams.get("q"), "odds");
  assert.equal(url.searchParams.has("page"), false);
});

test("unconfigured tag links keep the engine's independent category-filter behavior", () => {
  const options = filterOptions("/all", new URLSearchParams("tag=Bitcoin"), "全部");
  for (const option of options.filter(o => !o.key.startsWith("tag:"))) {
    assert.equal(new URL(option.to, "https://example.com").searchParams.get("tag"), "Bitcoin");
  }
});
