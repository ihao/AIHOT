// Exact accepted-only compatibility. Future rule hashes remain closed by default.
// Changed legacy rewrites require the reviewed immutable copy proof below.
export const EVIDENCE_RECOVERY_COMPATIBILITY_RULE_VERSION = 'automatic-publication-v1:743f241ab8a474544fda3e20';
const ACCEPTED_RULE_COMPATIBILITY: ReadonlyMap<string, readonly string[]> = new Map([
  [EVIDENCE_RECOVERY_COMPATIBILITY_RULE_VERSION, ['automatic-publication-v1:d7cc9c407669a5f9b1c67141', 'automatic-publication-v1:5c0e3a85b0b01eeb31df0874']],
  ['automatic-publication-v1:d7cc9c407669a5f9b1c67141', ['automatic-publication-v1:5c0e3a85b0b01eeb31df0874']],
]);

/** Only accepted grants may use these versions; a current round always takes precedence. */
export function acceptedAutomaticRuleVersions(currentVersion: string): readonly string[] {
  return [currentVersion, ...(ACCEPTED_RULE_COMPATIBILITY.get(currentVersion) ?? [])];
}

export interface LegacyCopyProof { article_id: string; automatic_rule_version: string; original_copy_hash: string; final_copy_hash: string }
// Reviewed in docs/research/2026-10-03-legacy-rewrite-core-audit.md. Never wildcard hashes/actors.
const AUDITED_LEGACY_COPY_PROOFS: readonly LegacyCopyProof[] = [
  {
    "article_id": "r3f3i2v1byjoauos58a7hkbkg",
    "automatic_rule_version": "automatic-publication-v1:5c0e3a85b0b01eeb31df0874",
    "original_copy_hash": "7ee878c4a10cabafe80cee57b1cff286fcf22770b72eb184cc978ae1a181a190",
    "final_copy_hash": "1634800aaefcd64adb8147f05c453e349e8be859f850b1a0533b542cf209f816"
  },
  {
    "article_id": "tgu4shbwnndketh9g6qdcbznd",
    "automatic_rule_version": "automatic-publication-v1:5c0e3a85b0b01eeb31df0874",
    "original_copy_hash": "1ea63dbd4341bf0afb6de0812ab5dfb6dccdc5ee0869decf53545336125b25c4",
    "final_copy_hash": "aaca4ad36401d796fe273c8fa5833f8393d1fc1a47d2ddfca40cf94646f1f97c"
  },
  {
    "article_id": "jdtjpdy376sqv8bb9cn8w177c",
    "automatic_rule_version": "automatic-publication-v1:5c0e3a85b0b01eeb31df0874",
    "original_copy_hash": "c52a0c167337e0f0d7ab133be1f684102f050ad459dc6689cd84de5dc99015bb",
    "final_copy_hash": "3d6bbfd6ad0d8a5792ea8aacb77509d5d99bfb07afffbfea6638bc6d6768a5a9"
  },
  {
    "article_id": "lv8x0ifqji4pafetbmnwp63wx",
    "automatic_rule_version": "automatic-publication-v1:5c0e3a85b0b01eeb31df0874",
    "original_copy_hash": "1a8ac734c151323a4543d11323413be7dff102cd44db7727efe3efe2bc1b3650",
    "final_copy_hash": "9bc86b44426c62f8d5300af9bf72f99abf45d6551f24adc71894606447ad5245"
  },
  {
    "article_id": "cy5jsrliyp7gijb3izxlu9n6h",
    "automatic_rule_version": "automatic-publication-v1:5c0e3a85b0b01eeb31df0874",
    "original_copy_hash": "65e2b704b5cf4d81684111611eb98c2a6969c0a6cfb168ba54480c1c877fd32c",
    "final_copy_hash": "c12d108692b7bd1a276ad9f27b521060975a90ec3aa77262316138cfd659d595"
  },
  {
    "article_id": "jpb3ckfvkko2x5fnuy0leiuip",
    "automatic_rule_version": "automatic-publication-v1:5c0e3a85b0b01eeb31df0874",
    "original_copy_hash": "aec64511e91c2c1a8d2121ea91e48527682754f2721b4b8807c51faa8c37c778",
    "final_copy_hash": "6a847e790ed85a0f12671961a6d0194651f863421a95730755296ae87c1ce08a"
  },
  {
    "article_id": "tdlm5fwnm4hootl3fvu2fi8si",
    "automatic_rule_version": "automatic-publication-v1:5c0e3a85b0b01eeb31df0874",
    "original_copy_hash": "d9d00eb5d920f47a6075706c174b81a2eb50c5c7c93ee7d5f7123ccdbd5d32ad",
    "final_copy_hash": "32ea1dc7cd41c28f1086254bc554676d0a11ca0480343f728d477eed5792a5d4"
  },
  {
    "article_id": "vpubul63ataxguv3rh1qpkauo",
    "automatic_rule_version": "automatic-publication-v1:5c0e3a85b0b01eeb31df0874",
    "original_copy_hash": "126686a6c15dd10f5862ef473787b7e63971916bac96db0ce203f5851207b5fd",
    "final_copy_hash": "f6e64647cc7b33efbeae6fb2ac8c7cb782b4d3dd57cab62e843d805a916d059f"
  },
  {
    "article_id": "m80hcljamfl7ks6xiqhdlrsp7",
    "automatic_rule_version": "automatic-publication-v1:5c0e3a85b0b01eeb31df0874",
    "original_copy_hash": "84fb848759dff3880b01bc941f68b8ed5f1c86a3964f1f6eefc3decf98285202",
    "final_copy_hash": "317047e6476cb1f01da6dd3773536465a6f158c2a5352f28f3f5f761ff98bff5"
  },
  {
    "article_id": "no1ay1x8r3pobwz02fdh5ayae",
    "automatic_rule_version": "automatic-publication-v1:d7cc9c407669a5f9b1c67141",
    "original_copy_hash": "25bd25548793b2635af02deca6b652c278c209471bff9a9dbb144f99c0de4b29",
    "final_copy_hash": "3177f3c5b70f769bc91a79bd4d101e56a5f3b5c1a450372a8aca8b80549c5110"
  }
];
export function auditedLegacyCopyProofs(currentVersion: string): readonly LegacyCopyProof[] {
  return currentVersion === EVIDENCE_RECOVERY_COMPATIBILITY_RULE_VERSION ? AUDITED_LEGACY_COPY_PROOFS : [];
}
export function compatibleAcceptedCopy(round: LegacyCopyProof & {rewritten:boolean}, currentVersion: string) {
  if (round.automatic_rule_version === currentVersion) return true;
  if (!acceptedAutomaticRuleVersions(currentVersion).slice(1).includes(round.automatic_rule_version)) return false;
  return !round.rewritten || round.original_copy_hash === round.final_copy_hash || auditedLegacyCopyProofs(currentVersion).some(p =>
    p.article_id === round.article_id && p.automatic_rule_version === round.automatic_rule_version &&
    p.original_copy_hash === round.original_copy_hash && p.final_copy_hash === round.final_copy_hash);
}
