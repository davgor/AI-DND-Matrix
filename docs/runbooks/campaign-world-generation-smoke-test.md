# Campaign world generation smoke test

Validates epic **054**: cascading world → regions → NPCs → story generation, persisted `world_*` columns, onboarding review world section, and hub read-only preview.

## Prerequisites

- `npm install`
- Configured LLM provider in `.env` for manual UI steps

## Automated smoke

```bash
npx vitest run src/db/migrateCampaignWorldV34.test.ts src/db/repositories/campaigns.test.ts src/agents/campaignGeneration/campaignGeneration.test.ts src/main/campaignCreateIpc.test.ts src/main/campaignHubIpc.test.ts src/renderer/src/campaignReview/CampaignReviewWorldSection.test.tsx
```

## Manual smoke (Campaign Review)

1. Run `npm run dev` with a configured provider (close any running packaged app first so `better-sqlite3` can rebuild).
2. Create a new campaign from the start modal.
3. During loading, confirm progress labels mention world, regions, NPCs, and story.
4. On Campaign Review, confirm a **World** section shows the setting name and three-paragraph summary.
5. Click **View full history** — read the one-pager, edit a line, save, and confirm it persists after navigating away and back.
6. Confirm regions and NPCs feel grounded in the world tone.

## Manual smoke (Campaign Hub)

1. Complete guided creation for one character so the campaign opens the hub.
2. Confirm the world summary appears in the hub preview (read-only).
3. **View full history** opens read-only modal (no Save button).

## Recorded run (template)

| Date | Tester | Result | Notes |
|------|--------|--------|-------|
|      |        |        |       |
