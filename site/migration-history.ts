// Frozen release evidence for site migrations absent from upstream main. Never advance this to HEAD:
// later migrations must still pass online safety checks against the PR base.
// The 72 deployed files are documented in docs/research/2026-10-15-upstream-integration.md.
export const MIGRATION_HISTORY_BASE = "14f4ba2e07ed7749e1379f4ac9c687349a81f9c3";
