import { describe, expect, it } from 'vitest'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { buildAvailableRaceOptions } from '../agents/raceLore'
import { createPartyMembers } from '../main/characterCreationIpc'
import { generateNpcForCampaign } from '../main/campaignEditIpc'
import { applyRaceSelection, previewRaceLore } from '../main/raceIpc'
import { createTestDb } from './testUtils'
import { createCampaign } from './repositories/campaigns'
import { createCharacter, getCharacterById } from './repositories/characters'
import { getCampaignRaceByKey, listCampaignRaces } from './repositories/campaignRaces'
import { listNpcsByRegion } from './repositories/npcs'
import { createRegion } from './repositories/regions'

const ELF_LORE = {
  summary: 'Elves guard the mistwood.',
  appearance: 'Pale and tall.',
  culture: 'Reclusive.',
  roleInThisLand: 'Wardens.',
  hooks: ['A grove dies.']
}

const CUSTOM_LORE = {
  summary: 'Starfolk descend at dusk.',
  appearance: 'Silver eyes.',
  culture: 'Nomadic.',
  roleInThisLand: 'Omen-readers.',
  hooks: ['A falling star.']
}

const DWARF_LORE = {
  summary: 'Dwarves hold the high passes.',
  appearance: 'Broad and stout.',
  culture: 'Clan-bound.',
  roleInThisLand: 'Gatekeepers.',
  hooks: ['A mine seals.']
}

function seedCampaign() {
  const db = createTestDb()
  const campaign = createCampaign(db, { name: 'C', premisePrompt: 'A realm.', deathMode: 'legendary' })
  return { db, campaign }
}

describe('race selection integration — locked reuse', () => {
  it('locks elf lore on first pick and reuses it read-only for a second character', async () => {
    const { db, campaign } = seedCampaign()
    const provider = createScriptedProvider([])
    const hero = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player'
    })
    await applyRaceSelection(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      kind: 'preset',
      raceKey: 'elf',
      label: 'Elf',
      seedPrompt: 'Long-lived.',
      finalLore: ELF_LORE
    })

    const second = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Alt',
      characterClass: 'rogue',
      kind: 'player',
      guidedCreationPhase: 'race'
    })
    const preview = await previewRaceLore(db, provider, {
      campaignId: campaign.id,
      kind: 'preset',
      raceKey: 'elf'
    })
    expect(preview.locked).toBe(true)
    expect(provider.calls).toHaveLength(0)

    await applyRaceSelection(db, {
      campaignId: campaign.id,
      characterId: second.id,
      kind: 'preset',
      raceKey: 'elf',
      label: 'Elf',
      seedPrompt: 'Long-lived.',
      finalLore: { ...ELF_LORE, summary: 'Should be discarded' }
    })
    expect(getCampaignRaceByKey(db, campaign.id, 'elf')?.lore.summary).toBe(ELF_LORE.summary)
  })
})

describe('race selection integration — custom NPC pick', () => {
  it('allows NPC generation to select a player-minted custom race', async () => {
    const { db, campaign } = seedCampaign()
    const region = createRegion(db, {
      campaignId: campaign.id,
      name: 'Skymark',
      description: 'High plateau.'
    })
    const hero = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'mage',
      kind: 'player'
    })
    await applyRaceSelection(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      kind: 'custom',
      label: 'Starfolk',
      seedPrompt: 'People of falling stars.',
      finalLore: CUSTOM_LORE
    })
    const playerRaceKey = getCharacterById(db, hero.id)?.raceKey
    const available = buildAvailableRaceOptions(listCampaignRaces(db, campaign.id))
    expect(available.some((option) => option.key === playerRaceKey)).toBe(true)

    const npcPayload = JSON.stringify({
      npc: {
        name: 'Lira',
        role: 'seer',
        disposition: 'quiet',
        backstory: 'Lira reads the sky.',
        regionName: 'Skymark',
        temperament: 'curious',
        canSpeak: true,
        alignment: 'neutral_good',
        race: playerRaceKey
      }
    })
    const provider = createScriptedProvider([npcPayload, '{"upgrade":false}'])
    await generateNpcForCampaign(db, provider, {
      campaignId: campaign.id,
      regionId: region.id,
      seedPrompt: 'A sky-watching seer.'
    })
    expect(listNpcsByRegion(db, region.id)[0]?.raceKey).toBe(playerRaceKey)
  })
})

describe('race selection integration — party member first', () => {
  it('reuses lore when a party member realizes a race the protagonist later selects', async () => {
    const { db, campaign } = seedCampaign()
    const provider = createScriptedProvider([JSON.stringify(DWARF_LORE)])
    await createPartyMembers(db, provider, {
      campaignId: campaign.id,
      members: [{ name: 'Brom', characterClass: 'fighter', personality: 'gruff', raceKey: 'dwarf' }]
    })
    const preview = await previewRaceLore(db, provider, {
      campaignId: campaign.id,
      kind: 'preset',
      raceKey: 'dwarf'
    })
    expect(preview.locked).toBe(true)
    expect(provider.calls).toHaveLength(1)
  })
})
