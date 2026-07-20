import { describe, expect, it } from 'vitest'
import { assembleNarrationContext, narrate, persistNarrationSideEffects } from './dm'
import { createScriptedProvider } from './providers/mockHarness'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createLogEntry, getLogEntryById, listLogEntriesByCharacter } from '../db/repositories/logEntries'
import { createRegion } from '../db/repositories/regions'

function seedPlayerWithTwoEntries() {
  const db = createTestDb()
  const campaign = createCampaign(db, { name: 'T', premisePrompt: 'x', deathMode: 'legendary' })
  const region = createRegion(db, { campaignId: campaign.id, name: 'R', description: 'd' })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Hero',
    characterClass: 'wizard',
    kind: 'player'
  })
  const wrongEntry = createLogEntry(db, {
    campaignId: campaign.id,
    characterId: player.id,
    category: 'thing',
    title: 'Old',
    content: 'Wrong name.',
    learnedInGameDate: 1
  })
  const staleEntry = createLogEntry(db, {
    campaignId: campaign.id,
    characterId: player.id,
    category: 'event',
    title: 'Stale',
    content: 'Never happened.',
    learnedInGameDate: 1
  })
  return { db, campaign, region, player, wrongEntry, staleEntry }
}

describe('persistNarrationSideEffects log book amendments', () => {
  it('applies amendments and deletions for the acting character', async () => {
    const { db, campaign, region, player, wrongEntry, staleEntry } = seedPlayerWithTwoEntries()

    await persistNarrationSideEffects(
      db,
      {
        narrationText: 'Fixed.',
        logBookAmendments: [{ entryId: wrongEntry.id, title: 'Sword', content: 'A sharp blade.' }],
        logBookDeletions: ['invalid-id', staleEntry.id]
      },
      { campaignId: campaign.id, regionId: region.id, characterId: player.id }
    )

    expect(getLogEntryById(db, wrongEntry.id)?.title).toBe('Sword')
    expect(listLogEntriesByCharacter(db, player.id).some((row) => row.id === staleEntry.id)).toBe(false)
  })
})

describe('log book amendment round-trip after context slimming (040.4)', () => {
  // persistLogBookAmendments/persistLogBookDeletions silently no-op unknown ids, so if
  // slimming ever dropped `id` from the prompt's log book section, self-maintenance
  // would break with zero errors. This proves the full echo loop still works.
  it('keeps entry ids in the narration prompt so an echoed amendment and deletion still apply', async () => {
    const { db, campaign, region, player, wrongEntry, staleEntry } = seedPlayerWithTwoEntries()
    const provider = createScriptedProvider([
      JSON.stringify({
        narrationText: 'You correct your notes.',
        logBookAmendments: [{ entryId: wrongEntry.id, title: 'Sword', content: 'A sharp blade.' }],
        logBookDeletions: [staleEntry.id]
      })
    ])
    const context = await assembleNarrationContext({
      db,
      campaignId: campaign.id,
      regionId: region.id,
      characterId: player.id,
      playerInput: 'I fix my log book'
    })

    const result = await narrate(provider, { success: true, total: 10, dc: 10 }, context)

    // The scripted response only echoes ids the DM could actually have read from the prompt.
    const prompt = provider.calls[0]?.prompt ?? ''
    expect(prompt).toContain(wrongEntry.id)
    expect(prompt).toContain(staleEntry.id)

    await persistNarrationSideEffects(db, result, {
      campaignId: campaign.id,
      regionId: region.id,
      characterId: player.id
    })

    expect(getLogEntryById(db, wrongEntry.id)?.title).toBe('Sword')
    expect(getLogEntryById(db, wrongEntry.id)?.content).toBe('A sharp blade.')
    expect(listLogEntriesByCharacter(db, player.id).some((row) => row.id === staleEntry.id)).toBe(false)
  })
})
