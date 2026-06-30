import { describe, expect, it } from 'vitest'
import { getCharacterById } from './repositories/characters'
import { listEventsByCampaign } from './repositories/events'
import { getSpellByKey } from './catalog/spells'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { hasArcaneOption } from '../agents/levelUp'
import {
  enrichTurnWithEncounterRewards,
  getPendingLevelUpCeremony,
  runQuestXpPass,
  submitPerkChoice
} from '../main/progressionPipeline'
import { createStoryThread } from './repositories/storyThreads'
import {
  ARCANE_LEVEL_UP_RESPONSE,
  COMBAT_XP_RESPONSE,
  COMBAT_LEVEL_UP_RESPONSE,
  COMBAT_LOOT_RESPONSE,
  QUEST_XP_RESPONSE,
  seedArcaneProgressionFixture,
  seedCombatProgressionFixture
} from './progressionSmokeFixtures'

describe('progression smoke — combat encounter', () => {
  it('awards XP and opens level-up with combat-themed options', async () => {
    const { db, campaign, region, player, encounter } = seedCombatProgressionFixture()
    const provider = createScriptedProvider([COMBAT_XP_RESPONSE, COMBAT_LEVEL_UP_RESPONSE, COMBAT_LOOT_RESPONSE])
    const turn = await enrichTurnWithEncounterRewards({
      db,
      provider,
      encounter,
      campaignId: campaign.id,
      playerCharacterId: player.id,
      regionId: region.id,
      base: { narrationText: 'Victory.', npcReactions: [], partyMemberActions: [], pendingAlignmentShift: null }
    })
    expect(turn.xpAmount).toBeGreaterThan(0)
    const updated = getCharacterById(db, player.id)!
    expect(updated.xp).toBeGreaterThan(0)
    const pending = getPendingLevelUpCeremony(db, player.id)
    expect(pending?.perks).toHaveLength(3)
    expect(pending?.perks.some((p) => p.category === 'extra_attack' || p.category === 'ac_bonus')).toBe(true)
  })
})

describe('progression smoke — quest complete', () => {
  it('awards quest XP and queues level-up ceremony', async () => {
    const { db, campaign, region, player } = seedCombatProgressionFixture()
    const thread = createStoryThread(db, {
      campaignId: campaign.id,
      title: 'Miller errand',
      state: 'completed',
      summary: 'Deliver grain to the mill.'
    })
    const provider = createScriptedProvider([QUEST_XP_RESPONSE, ARCANE_LEVEL_UP_RESPONSE])
    const xp = await runQuestXpPass({
      db,
      provider,
      campaignId: campaign.id,
      threadId: thread.id,
      regionId: region.id,
      playerCharacterId: player.id,
      playerLevel: player.level
    })
    expect(xp?.leveledUp).toBe(true)
    expect(getPendingLevelUpCeremony(db, player.id)).not.toBeNull()
  })
})

describe('progression smoke — arcane span', () => {
  it('offers spell_access and persists chosen spell', async () => {
    const { db, campaign, region, player, thread } = seedArcaneProgressionFixture()
    const provider = createScriptedProvider([QUEST_XP_RESPONSE, ARCANE_LEVEL_UP_RESPONSE])
    await runQuestXpPass({
      db,
      provider,
      campaignId: campaign.id,
      threadId: thread.id,
      regionId: region.id,
      playerCharacterId: player.id,
      playerLevel: 1
    })

    const pending = getPendingLevelUpCeremony(db, player.id)
    expect(pending).not.toBeNull()
    const agentPreview = {
      narrationText: pending!.narrationText,
      perks: pending!.perks
    }
    expect(hasArcaneOption(agentPreview)).toBe(true)

    const spellPerk = pending!.perks.find((p) => p.category === 'spell_access')
    expect(spellPerk?.catalogSpellKey).toBeTruthy()
    submitPerkChoice(db, player.id, spellPerk!.id)
    const updated = getCharacterById(db, player.id)!
    const keys = (updated.stats as { knownSpellKeys?: string[] }).knownSpellKeys ?? []
    expect(keys.some((key) => Boolean(getSpellByKey(db, key)))).toBe(true)
    expect(listEventsByCampaign(db, campaign.id).some((e) => e.type === 'perk_chosen')).toBe(true)
  })
})
