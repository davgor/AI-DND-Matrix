import { describe, expect, it } from 'vitest'
import { persistGeneratedCampaign } from '../agents/campaignGeneration/persist'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { persistQuestNarrationSideEffects } from '../agents/questNarration'
import { createTestDb } from './testUtils'
import { createCharacter } from './repositories/characters'
import { listEventsByCampaign } from './repositories/events'
import {
  getMainQuestByCampaign,
  listQuestsByCampaign,
  seedCharacterQuestMembership,
  upsertCharacterQuest
} from './repositories/quests'
import { buildQuestViews } from '../main/questIpc'
import { runQuestXpPass } from '../main/progressionPipeline'
import { QUEST_SMOKE_GENERATION } from './questLogSmokeFixtures'

describe('quest log smoke rewards', () => {
  it('seeds main quest, accepts side quest, and completes with XP', async () => {
    const db = createTestDb()
    const provider = createScriptedProvider([JSON.stringify({ difficulty: 'medium' })])
    const campaign = await persistGeneratedCampaign({
      db,
      provider,
      input: {
        name: 'Smoke',
        premisePrompt: 'You arrive in Millbrook with unanswered questions.',
        deathMode: 'legendary'
      },
      generation: QUEST_SMOKE_GENERATION
    })
    const hero = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player',
      level: 3
    })
    seedCharacterQuestMembership(db, campaign.id, hero.id, 0)
    expect(getMainQuestByCampaign(db, campaign.id)?.hookLine).toContain('Millbrook')
    const side = listQuestsByCampaign(db, campaign.id).find((quest) => quest.kind === 'side')!
    upsertCharacterQuest(db, { characterId: hero.id, questId: side.id, status: 'active', acceptedInGameDate: 1 })
    persistQuestNarrationSideEffects(
      db,
      { narrationText: 'Done.', questCompletions: [side.id] },
      { campaignId: campaign.id, characterId: hero.id }
    )
    const xp = await runQuestXpPass({
      db,
      provider,
      campaignId: campaign.id,
      questId: side.id,
      regionId: side.regionId!,
      playerCharacterId: hero.id,
      playerLevel: hero.level
    })
    expect(xp?.xpAmount).toBeGreaterThan(0)
    expect(listEventsByCampaign(db, campaign.id).some((event) => event.type === 'xp_awarded')).toBe(true)
    expect(buildQuestViews(db, hero.id).find((row) => row.quest.id === side.id)?.characterQuest.status).toBe(
      'completed'
    )
  })
})
