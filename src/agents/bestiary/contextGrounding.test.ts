import { describe, expect, it } from 'vitest'
import { createTestDb } from '../../db/testUtils'
import { createCampaign } from '../../db/repositories/campaigns'
import { createRegion } from '../../db/repositories/regions'
import { createCharacter } from '../../db/repositories/characters'
import { createBestiarySpecies } from '../../db/repositories/bestiary'
import { appendBestiaryDiscoveredFact } from '../../db/repositories/bestiaryKnowledge'
import { createNpc } from '../../db/repositories/npcs'
import {
  BESTIARY_RECALL_BASE_LORE_MAX,
  loadPresentBestiaryGrounding,
  type PresentNpcForBestiaryRecall
} from './contextGrounding'

const LORE =
  'Rift-beasts pour from tears in the sky. Their hide drinks moonlight and their howls freeze the marrow of travelers who linger on the open road at dusk.'

function seed() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Recall',
    premisePrompt: 'Beasts',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Road',
    description: 'Dust'
  })
  const hero = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Hero',
    characterClass: 'fighter',
    kind: 'player'
  })
  return { db, campaign, region, hero }
}

describe('loadPresentBestiaryGrounding slim lore (116.10)', () => {
  it('returns slim grounding for present NPCs with bestiarySpeciesId', () => {
    const { db, campaign, region, hero } = seed()
    const species = createBestiarySpecies(db, {
      campaignId: campaign.id,
      key: 'rift-beast',
      name: 'Rift-beast',
      baseLore: LORE,
      buckets: ['beast'],
      tags: ['rift']
    })
    appendBestiaryDiscoveredFact(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      speciesId: species.id,
      title: 'Moonlight hide',
      content: 'Their hide drinks moonlight.'
    })
    const instance = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Rift-beast',
      role: 'enemy',
      disposition: 'hostile',
      bestiarySpeciesId: species.id,
      bestiaryVariantKey: 'standard',
      skipCombatHydration: true
    })
    const present: PresentNpcForBestiaryRecall[] = [
      { id: instance.id, bestiarySpeciesId: species.id }
    ]

    const grounding = loadPresentBestiaryGrounding(db, {
      characterId: hero.id,
      presentNpcs: present
    })

    expect(grounding).toHaveLength(1)
    expect(grounding[0]).toMatchObject({
      speciesId: species.id,
      speciesName: 'Rift-beast',
      discoveredFactTitles: ['Moonlight hide']
    })
    expect(grounding[0]!.baseLoreExcerpt.length).toBeLessThanOrEqual(BESTIARY_RECALL_BASE_LORE_MAX)
    expect(grounding[0]!.baseLoreExcerpt.startsWith('Rift-beasts')).toBe(true)
  })
})

describe('loadPresentBestiaryGrounding dedupe (116.10)', () => {
  it('skips NPCs without bestiarySpeciesId and dedupes by species', () => {
    const { db, campaign, region, hero } = seed()
    const species = createBestiarySpecies(db, {
      campaignId: campaign.id,
      key: 'gray-wolf',
      name: 'Gray Wolf',
      baseLore: 'Wolves hunt in packs along the border.',
      buckets: ['beast'],
      tags: ['pack']
    })
    const a = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Wolf A',
      role: 'enemy',
      disposition: 'hostile',
      bestiarySpeciesId: species.id,
      skipCombatHydration: true
    })
    const b = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Wolf B',
      role: 'enemy',
      disposition: 'hostile',
      bestiarySpeciesId: species.id,
      skipCombatHydration: true
    })

    const grounding = loadPresentBestiaryGrounding(db, {
      characterId: hero.id,
      presentNpcs: [
        { id: a.id, bestiarySpeciesId: species.id },
        { id: b.id, bestiarySpeciesId: species.id },
        { id: 'villager', bestiarySpeciesId: null }
      ]
    })

    expect(grounding).toHaveLength(1)
    expect(grounding[0]!.speciesName).toBe('Gray Wolf')
  })
})
