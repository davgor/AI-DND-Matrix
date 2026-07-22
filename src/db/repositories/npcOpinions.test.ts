import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createCharacter } from './characters'
import {
  bumpNpcPlayerInteractionAt,
  createNpc,
  updateNpcOpinionSummary
} from './npcs'
import { createRegion } from './regions'
import { migrations } from '../schema'
import { runMigrations } from '../migrations'
import {
  bumpNpcOpinionSubjectInteraction,
  ensurePlayerOpinionFromLegacy,
  getNpcOpinion,
  listNpcOpinionsByNpc,
  upsertNpcOpinion
} from './npcOpinions'
import { npcOpinionSubject, playerOpinionSubject } from '../../shared/npcRelationships/types'

function seedCampaign(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Opinion Store',
    premisePrompt: 'test',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Town',
    description: 'A town.'
  })
  const hero = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Hero',
    characterClass: 'fighter',
    kind: 'player'
  })
  const ally = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Ally',
    characterClass: 'wizard',
    kind: 'player'
  })
  const mira = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Mira',
    role: 'innkeeper',
    disposition: 'warm'
  })
  const captain = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Captain',
    role: 'guard',
    disposition: 'stern'
  })
  return { campaign, hero, ally, mira, captain }
}

describe('npc_opinions upsert and isolation', () => {
  it('upserts and isolates opinions by subject', () => {
    const db = createTestDb()
    const { campaign, hero, ally, mira, captain } = seedCampaign(db)

    upsertNpcOpinion(db, {
      campaignId: campaign.id,
      npcId: mira.id,
      subject: playerOpinionSubject(hero.id),
      summary: 'Likes the hero.',
      generatedAt: '2026-07-20T12:00:00.000Z',
      stance: 'warm'
    })
    upsertNpcOpinion(db, {
      campaignId: campaign.id,
      npcId: mira.id,
      subject: playerOpinionSubject(ally.id),
      summary: 'Wary of the ally.',
      generatedAt: '2026-07-20T12:05:00.000Z',
      stance: 'wary'
    })
    upsertNpcOpinion(db, {
      campaignId: campaign.id,
      npcId: mira.id,
      subject: npcOpinionSubject(captain.id),
      summary: 'Resents the captain.',
      generatedAt: '2026-07-20T12:10:00.000Z',
      stance: 'hostile'
    })

    expect(getNpcOpinion(db, mira.id, playerOpinionSubject(hero.id))?.summary).toBe(
      'Likes the hero.'
    )
    expect(getNpcOpinion(db, mira.id, playerOpinionSubject(ally.id))?.summary).toBe(
      'Wary of the ally.'
    )
    expect(getNpcOpinion(db, mira.id, npcOpinionSubject(captain.id))?.summary).toBe(
      'Resents the captain.'
    )
    expect(listNpcOpinionsByNpc(db, mira.id)).toHaveLength(3)
  })
})

describe('npc_opinions watermarks', () => {
  it('bumps per-subject watermark without touching other subjects', () => {
    const db = createTestDb()
    const { campaign, hero, mira, captain } = seedCampaign(db)
    upsertNpcOpinion(db, {
      campaignId: campaign.id,
      npcId: mira.id,
      subject: npcOpinionSubject(captain.id),
      summary: 'Cold.',
      generatedAt: '2026-07-20T12:00:00.000Z',
      stance: 'hostile'
    })
    upsertNpcOpinion(db, {
      campaignId: campaign.id,
      npcId: mira.id,
      subject: playerOpinionSubject(hero.id),
      summary: 'Friendly.',
      generatedAt: '2026-07-20T12:00:00.000Z',
      stance: 'warm'
    })

    bumpNpcOpinionSubjectInteraction(
      db,
      mira.id,
      npcOpinionSubject(captain.id),
      '2026-07-20T14:00:00.000Z'
    )

    expect(
      getNpcOpinion(db, mira.id, npcOpinionSubject(captain.id))?.lastRelevantInteractionAt
    ).toBe('2026-07-20T14:00:00.000Z')
    expect(
      getNpcOpinion(db, mira.id, playerOpinionSubject(hero.id))?.lastRelevantInteractionAt
    ).toBeNull()
  })
})

describe('npc_opinions legacy copy', () => {
  it('copies legacy opinionSummary into the player-subject row', () => {
    const db = createTestDb()
    const { hero, mira } = seedCampaign(db)
    updateNpcOpinionSummary(db, mira.id, {
      summary: 'Stored on npc row.',
      generatedAt: '2026-07-20T12:00:00.000Z'
    })
    bumpNpcPlayerInteractionAt(db, mira.id, '2026-07-20T11:00:00.000Z')

    const row = ensurePlayerOpinionFromLegacy(db, mira.id, hero.id)
    expect(row?.summary).toBe('Stored on npc row.')
    expect(row?.generatedAt).toBe('2026-07-20T12:00:00.000Z')
    expect(row?.lastRelevantInteractionAt).toBe('2026-07-20T11:00:00.000Z')
  })
})

describe('npc_opinions cascade delete', () => {
  it('removes opinion rows when the holder NPC is deleted', () => {
    const db = createTestDb()
    db.pragma('foreign_keys = ON')
    const { campaign, hero, mira } = seedCampaign(db)
    upsertNpcOpinion(db, {
      campaignId: campaign.id,
      npcId: mira.id,
      subject: playerOpinionSubject(hero.id),
      summary: 'Temp.',
      generatedAt: '2026-07-20T12:00:00.000Z',
      stance: 'warm'
    })

    db.prepare('DELETE FROM npcs WHERE id = ?').run(mira.id)
    expect(getNpcOpinion(db, mira.id, playerOpinionSubject(hero.id))).toBeUndefined()
  })
})

describe('npc_opinions migration data copy', () => {
  it('migrates legacy columns into player-subject rows on v52', () => {
    const db = new Database(':memory:')
    runMigrations(
      db,
      migrations.filter((m) => m.version <= 51)
    )

    const campaign = createCampaign(db, {
      name: 'Legacy Migrate',
      premisePrompt: 'p',
      deathMode: 'legendary'
    })
    const region = createRegion(db, {
      campaignId: campaign.id,
      name: 'Town',
      description: 'd'
    })
    const hero = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player'
    })
    const mira = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Mira',
      role: 'innkeeper',
      disposition: 'warm'
    })
    updateNpcOpinionSummary(db, mira.id, {
      summary: 'Glad you visited.',
      generatedAt: '2026-07-20T12:00:00.000Z'
    })
    bumpNpcPlayerInteractionAt(db, mira.id, '2026-07-20T11:00:00.000Z')

    runMigrations(
      db,
      migrations.filter((m) => m.version === 52)
    )

    const row = getNpcOpinion(db, mira.id, playerOpinionSubject(hero.id))
    expect(row?.summary).toBe('Glad you visited.')
    expect(row?.generatedAt).toBe('2026-07-20T12:00:00.000Z')
    expect(row?.lastRelevantInteractionAt).toBe('2026-07-20T11:00:00.000Z')
  })
})
