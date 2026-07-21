# Companions onboarding smoke test

Validates epic **129**: prompt-generated AI party companions between equipment and identity — skip, generate, accept, play order, starter gear, and roster UX. Companion face-token images are **out of scope** (epic **139**).

## Prerequisites

- `npm install`
- Native module built: `npm run rebuild:node` (runs automatically via `pretest`)

## Automated smoke

```bash
npx vitest run \
  src/shared/guidedCreation/stageRouting.test.ts \
  src/db/startingLoadoutApply.test.ts \
  src/main/companionsIpc.test.ts \
  src/main/companionStarterGear.test.ts \
  src/main/companionFleeFollow.test.ts \
  src/agents/partyMember.test.ts \
  src/renderer/src/companionsSelection/CompanionsSelection.test.ts \
  src/renderer/src/playView/PlayCompanionRoster.test.tsx
```

Flow covered:

1. Equipment confirm advances guided phase to `companions` (not identity)
2. Stage routing resumes `companionPrompt` mid-onboarding
3. Empty prompt disables Generate; skip advances to identity with empty roster
4. Generate → accept persists owned `ai_party_member` and advances to identity
5. Accept with empty preview inventory grants archetype starter weapon (persist + DB reopen)
6. Invalid preview catalog ids are dropped at grant time
7. Identity kickoff includes companion digest when roster is non-empty
8. Play: `companions:setOrder` writes/clears `stats.companionOrder`; order appears in party-member agent context
9. Flee success exits living owned companions with the player (unconscious / left-behind skipped)
10. Play roster panel: empty vs populated; letter-initial avatar or existing `portraitPath`

## Manual smoke (full app + UI)

1. Run `npm run dev` with a configured provider.
2. Create a campaign; complete race, background, and equipment.
3. Confirm equipment lands on **Traveling companion** (not identity interview).
4. **Skip path:** click skip/continue with no companion → identity interview starts with empty roster.
5. **Generate path:** enter a prompt, Generate, review preview, Accept → identity interview; companion name appears in DM grounding.
6. Enter play; confirm companion roster bar under session chrome (name + role + letter avatar).
7. Select companion, enter a short order (e.g. "Hold the doorway"), click **Set order**.
8. Trigger a companion turn or flee — companion should follow flee success when conscious.
9. Restart mid-`companions` phase; confirm the step restores correctly.

Face-token portraits for companions are deferred to epic **139**; roster uses letter initials or an existing `portraitPath` only.

## Recorded run (template)

| Date | Mode | Result | Notes |
|------|------|--------|-------|
| 2026-07-21 | vitest | pass | targeted 129 smoke files |
