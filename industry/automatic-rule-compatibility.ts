// This release only expands topic vocabulary and recall. Scoring, evidence and safety gates
// are unchanged. A future rule hash is closed by default, even if it follows this release.
const ACCEPTED_RULE_COMPATIBILITY: ReadonlyMap<string, readonly string[]> = new Map([
  ['automatic-publication-v1:d7cc9c407669a5f9b1c67141', ['automatic-publication-v1:5c0e3a85b0b01eeb31df0874']],
]);

/** Only accepted grants may use these versions; a current round always takes precedence. */
export function acceptedAutomaticRuleVersions(currentVersion: string): readonly string[] {
  return [currentVersion, ...(ACCEPTED_RULE_COMPATIBILITY.get(currentVersion) ?? [])];
}
