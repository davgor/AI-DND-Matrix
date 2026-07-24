# 165 — Skeleton fill: retrieve strings, engine fills

Campaign create fails when local models do not emit clean `<<<TOKEN>>>…<<</TOKEN>>>` grids. Observed pantheon + world shapes:

1. Echo of format examples (`<<<TOKEN>>>` / `value text here`)
2. Nested / collapsed pantheon deity fields; omitted closing tags
3. World stage echoing skeleton placeholders as section headers (`{{WORLD_NAME}}` + body) instead of labeled blocks

**Approach:** treat the LLM as a string source. Retrieve field strings from labeled blocks **and** `{{TOKEN}}` headers (lenient EOF/next-open). Engine loads them into the engine-owned JSON skeleton (`fillSkeletonFromValues` / `retrieveSkeletonFillValues`). Pantheon keeps composite `<<<DEITY_N>>>` retrieve in `pantheonRetrieve.ts`.

## Acceptance criteria

- [ ] `fillSkeletonFromValues` + `retrieveSkeletonFillValues` load token→string maps into engine skeletons
- [ ] Pantheon retrieve accepts composite `<<<DEITY_N>>>`, per-field, collapsed NAME, and omitted closes
- [ ] World/generic `fillSkeleton` accepts `<<<TOKEN>>>` blocks and `{{TOKEN}}` section headers (prefer short label when duplicate headers)
- [ ] Lenient extract: next open / orphan close / EOF ends a block; close tags accept `>>` or `>>>`; `{{@TOKEN}}` bodies coerce to leading JSON fragment
- [ ] Bestiary dumps with `<<</FOE_N_*>>` (2 closers) and `{{@FOE_N_BUCKETS}}` headers fill and JSON.parse
- [ ] Regions: remap reused `REGION_0_*` → `REGION_1_*`; split overflow NAME prose into DESCRIPTION; map `POTENTIAL_QUESTS` + `HISTORY_BACKSTORIY`; JSON fallback when skeleton fill fails; regions maxTokens 8192
- [ ] Unit + contract tests cover live dumps; delivery gate pass
- [ ] Campaign create checklist: contract tests green
