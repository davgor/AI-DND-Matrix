import { getSpellByKey } from '../db/catalog/spells'
import { getCharacterById, updateCharacter } from '../db/repositories/characters'
import { appendKnownSpellKeys } from '../engine/knownSpells'
import { listKnownSpellsForCharacter } from '../main/spellbookIpcHandlers'
import { submitPerkChoice } from '../main/progressionPipeline'
import {
  ARCANE_LEVEL_UP_RESPONSE,
  QUEST_XP_RESPONSE,
  seedArcaneProgressionFixture
} from './progressionSmokeFixtures'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { runQuestXpPass, getPendingLevelUpCeremony } from '../main/progressionPipeline'
import { describe, expect, it } from 'vitest'

describe('spellbook smoke — level-up spell_access', () => {
  it('lists firebolt after arcane perk choice', async () => {
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
    const spellPerk = pending!.perks.find((p) => p.category === 'spell_access')
    submitPerkChoice(db, player.id, spellPerk!.id)
    const spells = listKnownSpellsForCharacter(db, player.id)
    expect(spells.some((spell) => spell.catalogKey === 'firebolt' || spell.name === 'Firebolt')).toBe(true)
  })
})

describe('spellbook smoke — DM spell grant', () => {
  it('persists validated catalog spell keys', () => {
    const { db, player } = seedArcaneProgressionFixture()
    const character = getCharacterById(db, player.id)!
    const keys = appendKnownSpellKeys(
      (character.stats as { knownSpellKeys?: string[] }).knownSpellKeys ?? [],
      ['firebolt', 'invalid-spell'],
      (key) => Boolean(getSpellByKey(db, key))
    )
    updateCharacter(db, player.id, { stats: { ...character.stats, knownSpellKeys: keys } })
    const spells = listKnownSpellsForCharacter(db, player.id)
    expect(spells.map((spell) => spell.catalogKey)).toEqual(['firebolt'])
  })
})
