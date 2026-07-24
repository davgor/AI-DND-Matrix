# 168 — Regions skeleton: empty remaps + live dump resilience

Campaign create regions stage fails after 3 attempts on local llama dumps:

1. **Empty duplicate steal** — after a full `REGION_0_*` grid, models emit empty `<<<REGION_0_NAME>>><<</REGION_0_NAME>>>` before `REGION_1_*`. Lenient remap assigns that empty body to `REGION_1_NAME`, then the real `REGION_1_NAME` hits `duplicate_token` and extract aborts (all labeled values dropped) → `unparseable`.
2. **Truncation** — attempt 2 only emits region 0 (needs retry / higher tokens; not inventable).
3. **Hyphen jargon `invalid`** — attempt 3 can fill but fails `meetsProseJargonStandards` on normal pairs like `once-vibrant` + `half-submerged` in one sentence.

## Acceptance criteria

- [x] Live attempt-1 shaped dump (empty mid `REGION_0_NAME` + full `REGION_1_*` + `HISTORY_BACKSTORIY`) fills both regions via `fillSkeleton`
- [x] Lenient extract skips empty remaps and skips unremappable duplicate blocks instead of failing the whole extract
- [x] Region trope/jargon path does not false-reject the Flooded Flats / Tempest Ridge live prose (unit test)
- [x] Unit tests + delivery gate pass
