import { describe, expect, it } from 'vitest'
import { createTestDb } from '../../db/testUtils'
import { createCampaign } from '../../db/repositories/campaigns'
import { createCharacter } from '../../db/repositories/characters'
import {
  createBestiarySpecies,
  getBestiarySpeciesById,
  getBestiarySpeciesByKey,
  listQuestFoeAssignments
} from '../../db/repositories/bestiary'
import { createQuest } from '../../db/repositories/quests'
import { createScriptedProvider } from '../providers/mockHarness'
import {
  assignQuestFoes,
  parseEnemyHintsFromQuestText
} from './assignQuestFoes'

const RIFT_LORE =
  'Rift-beasts stalk the torn edges of the world, hunting in packs near planar scars.'

const RIFT_TITLE = 'Clear the rift-beasts from the rift'
const RIFT_SUMMARY = 'Drive the pack back through the tear.'

describe('parseEnemyHintsFromQuestText', () => {
  it('detects known rift-beast tag from clear quest wording', () => {
    const hints = parseEnemyHintsFromQuestText(RIFT_TITLE, RIFT_SUMMARY)
    expect(hints.length).toBeGreaterThanOrEqual(1)
    expect(hints.some((h) => h.speciesKey === 'rift-beast')).toBe(true)
    expect(hints.find((h) => h.speciesKey === 'rift-beast')?.name.toLowerCase()).toContain('rift')
  })

  it('detects known tags wolf, goblin, slime', () => {
    expect(parseEnemyHintsFromQuestText('Hunt the wolves', '').some((h) => h.speciesKey === 'wolf')).toBe(
      true
    )
    expect(
      parseEnemyHintsFromQuestText('Slay the goblins at the gate', '').some((h) => h.speciesKey === 'goblin')
    ).toBe(true)
    expect(parseEnemyHintsFromQuestText('Defeat the slime', '').some((h) => h.speciesKey === 'slime')).toBe(
      true
    )
  })

  it('extracts noun after clear/slay/defeat/hunt when not a known tag', () => {
    const hints = parseEnemyHintsFromQuestText('Clear the bandits from the road', '')
    expect(hints.some((h) => h.speciesKey === 'bandit')).toBe(true)
  })

  it('returns empty when no enemy wording', () => {
    expect(parseEnemyHintsFromQuestText('Deliver the package', 'Take it to the docks.')).toEqual([])
  })
})

describe('assignQuestFoes creates species', () => {
  it('creates missing species and writes foe assignment rows', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Foe Assign',
      premisePrompt: 'Rifts',
      deathMode: 'legendary'
    })
    const quest = createQuest(db, {
      campaignId: campaign.id,
      kind: 'side',
      title: RIFT_TITLE,
      summary: RIFT_SUMMARY,
      scale: 'minor',
      objectives: [{ id: 'obj-1', text: 'Clear the rift', done: false }]
    })
    const provider = createScriptedProvider([])

    const assigned = await assignQuestFoes(db, provider, {
      campaignId: campaign.id,
      questId: quest.id,
      title: quest.title,
      summary: quest.summary
    })

    expect(assigned.length).toBeGreaterThanOrEqual(1)
    expect(listQuestFoeAssignments(db, quest.id)).toHaveLength(assigned.length)
    const species = getBestiarySpeciesById(db, assigned[0]!.speciesId)
    expect(species).toBeDefined()
    expect(species!.key === 'rift-beast' || species!.name.toLowerCase().includes('rift')).toBe(true)
    expect(getBestiarySpeciesByKey(db, campaign.id, 'rift-beast')).toBeDefined()
    // Preset lore may still trigger one appearance-only LLM attempt (failures are non-fatal).
    expect(provider.calls.length).toBeLessThanOrEqual(1)
  })
})

describe('assignQuestFoes reuses species', () => {
  it('reuses existing campaign species instead of duplicating', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Foe Reuse',
      premisePrompt: 'Rifts',
      deathMode: 'legendary'
    })
    const existing = createBestiarySpecies(db, {
      campaignId: campaign.id,
      key: 'rift-beast',
      name: 'Rift-beast',
      baseLore: RIFT_LORE,
      buckets: ['beast'],
      tags: ['rift']
    })
    const quest = createQuest(db, {
      campaignId: campaign.id,
      kind: 'side',
      title: 'Clear the rift-beasts',
      summary: 'Clear them out.',
      scale: 'minor',
      objectives: [{ id: 'obj-1', text: 'Clear', done: false }]
    })
    const provider = createScriptedProvider([])

    const assigned = await assignQuestFoes(db, provider, {
      campaignId: campaign.id,
      questId: quest.id,
      title: quest.title,
      summary: quest.summary
    })

    expect(assigned).toHaveLength(1)
    expect(assigned[0]!.speciesId).toBe(existing.id)
    expect(provider.calls.length).toBe(0)
  })
})

describe('assignQuestFoes combat isolation', () => {
  it('does not invoke combat start APIs', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'No Combat',
      premisePrompt: 'Rifts',
      deathMode: 'legendary'
    })
    createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player'
    })
    const quest = createQuest(db, {
      campaignId: campaign.id,
      kind: 'side',
      title: RIFT_TITLE,
      summary: 'Clear them.',
      scale: 'minor',
      objectives: [{ id: 'obj-1', text: 'Clear', done: false }]
    })
    const provider = createScriptedProvider([])

    await assignQuestFoes(db, provider, {
      campaignId: campaign.id,
      questId: quest.id,
      title: quest.title,
      summary: quest.summary
    })

    expect(db.prepare('SELECT COUNT(*) AS c FROM combat_encounters').get()).toEqual({ c: 0 })
  })
})
