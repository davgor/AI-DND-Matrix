import type Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createDeity } from '../db/repositories/deities'
import {
  createFaction,
  findDivineManifestationNpc,
  listFactionsByCampaign
} from '../db/repositories/factions'
import { listNpcsByRegion } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { assembleNpcContext } from './npc'
import { persistNarrationSideEffects } from './dm'
import {
  ensureDeityManifestationNpc,
  type EnsureDeityManifestationResult
} from './deityManifestation'
import { createScriptedProvider } from './providers/mockHarness'

function seedCampaign(db: Database.Database) {
  const campaign = createCampaign(db, {
    name: 'Faiths',
    premisePrompt: 'Gods walk',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Temple Ward',
    description: 'Stone courts'
  })
  const hero = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Aria',
    characterClass: 'cleric',
    kind: 'player'
  })
  return { campaign, region, hero }
}

function seedLivingDeity(db: Database.Database, campaignId: string) {
  return createDeity(db, {
    campaignId,
    name: 'Vhalor',
    epithet: 'the Drowned',
    domains: ['tides', 'oaths'],
    tenets: ['Keep oaths'],
    blurb: 'Tide judge who answers drowned prayers.',
    isForgotten: false,
    sortOrder: 0
  })
}

function seedForgottenDeity(db: Database.Database, campaignId: string) {
  return createDeity(db, {
    campaignId,
    name: 'Ashen Hearth',
    epithet: 'the Ember That Was',
    domains: ['ash', 'embers'],
    tenets: ['Tend coal'],
    blurb: 'A hollow remnant of a dead hearth cult.',
    isForgotten: true,
    sortOrder: 1
  })
}

function ensureInRegion(
  db: Database.Database,
  campaignId: string,
  regionId: string,
  proposal: { deityId?: string; deityKey?: string }
) {
  return ensureDeityManifestationNpc(db, {
    campaignId,
    proposal,
    fallbackRegionId: regionId
  })
}

describe('ensureDeityManifestationNpc create', () => {
  it('creates an NPC bound to deity_id on first manifestation', () => {
    const db = createTestDb()
    const { campaign, region } = seedCampaign(db)
    const deity = seedLivingDeity(db, campaign.id)
    const temple = createFaction(db, {
      campaignId: campaign.id,
      key: 'tide-temple',
      name: 'Tide Temple',
      kind: 'religious',
      summary: 'Clergy of the drowned judge.',
      deityId: deity.id,
      sortOrder: 0,
      source: 'campaign_create'
    })
    const result = ensureInRegion(db, campaign.id, region.id, { deityId: deity.id })
    expect(result.status).toBe('created')
    if (result.status !== 'created') {
      return
    }
    expect(result.npc.deityId).toBe(deity.id)
    expect(result.npc.isDivineManifestation).toBe(true)
    expect(result.npc.canSpeak).toBe(true)
    expect(result.npc.name).toBe('Vhalor')
    expect(result.npc.factionId).toBe(temple.id)
    expect(result.npc.regionId).toBe(region.id)
    expect(findDivineManifestationNpc(db, campaign.id, deity.id)?.id).toBe(result.npc.id)
  })
})

describe('ensureDeityManifestationNpc idempotency', () => {
  it('reuses the same NPC on second manifestation', () => {
    const db = createTestDb()
    const { campaign, region } = seedCampaign(db)
    const deity = seedLivingDeity(db, campaign.id)
    const first = ensureInRegion(db, campaign.id, region.id, { deityId: deity.id })
    const second = ensureInRegion(db, campaign.id, region.id, { deityKey: 'vhalor' })
    expect(first.status).toBe('created')
    expect(second.status).toBe('reused')
    if (first.status === 'rejected' || second.status === 'rejected') {
      return
    }
    expect(second.npc.id).toBe(first.npc.id)
    expect(listNpcsByRegion(db, region.id)).toHaveLength(1)
  })
})

describe('ensureDeityManifestationNpc rejection', () => {
  it('rejects missing deity without creating an NPC', () => {
    const db = createTestDb()
    const { campaign, region } = seedCampaign(db)
    const result: EnsureDeityManifestationResult = ensureInRegion(db, campaign.id, region.id, {
      deityId: 'missing-deity'
    })
    expect(result).toEqual({ status: 'rejected', reason: 'missing_deity' })
    expect(listNpcsByRegion(db, region.id)).toHaveLength(0)
    expect(listFactionsByCampaign(db, campaign.id)).toHaveLength(0)
  })
})

describe('ensureDeityManifestationNpc forgotten god', () => {
  it('manifests a forgotten god as a normal NPC row', () => {
    const db = createTestDb()
    const { campaign, region } = seedCampaign(db)
    const forgotten = seedForgottenDeity(db, campaign.id)
    const cult = createFaction(db, {
      campaignId: campaign.id,
      key: 'ash-cult',
      name: 'Ash Cult',
      kind: 'religious',
      summary: 'Forgotten fire.',
      deityId: forgotten.id,
      sortOrder: 0,
      source: 'campaign_create'
    })
    const result = ensureInRegion(db, campaign.id, region.id, { deityKey: 'ashen-hearth' })
    expect(result.status).toBe('created')
    if (result.status !== 'created') {
      return
    }
    expect(result.npc.deityId).toBe(forgotten.id)
    expect(result.npc.isDivineManifestation).toBe(true)
    expect(result.npc.canSpeak).toBe(true)
    expect(result.npc.factionId).toBe(cult.id)
    expect(result.npc.name).toBe('Ashen Hearth')
  })
})

describe('persistNarrationSideEffects deityManifestation', () => {
  it('persists manifestation and grounds the NPC for Social/agent use', async () => {
    const db = createTestDb()
    const { campaign, region, hero } = seedCampaign(db)
    const deity = seedLivingDeity(db, campaign.id)
    await persistNarrationSideEffects(
      db,
      {
        narrationText: 'Vhalor rises from the tide.',
        deityManifestation: { deityId: deity.id }
      },
      {
        campaignId: campaign.id,
        regionId: region.id,
        characterId: hero.id,
        provider: createScriptedProvider([])
      }
    )
    const manifestation = findDivineManifestationNpc(db, campaign.id, deity.id)
    expect(manifestation).toBeDefined()
    expect(manifestation?.regionId).toBe(region.id)
    expect(manifestation?.canSpeak).toBe(true)
    const context = await assembleNpcContext(db, manifestation!)
    expect(context.npcId).toBe(manifestation!.id)
  })

  it('skips missing deity proposals during narration persist', async () => {
    const db = createTestDb()
    const { campaign, region, hero } = seedCampaign(db)
    await persistNarrationSideEffects(
      db,
      {
        narrationText: 'Nothing answers.',
        deityManifestation: { deityId: 'ghost-god' }
      },
      {
        campaignId: campaign.id,
        regionId: region.id,
        characterId: hero.id,
        provider: createScriptedProvider([])
      }
    )
    expect(listNpcsByRegion(db, region.id)).toHaveLength(0)
  })
})
