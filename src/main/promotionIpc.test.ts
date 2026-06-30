import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { appendNpcMemory } from '../db/repositories/npcMemories'
import { createNpc, getNpcById } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { createCharacter, listCharactersByCampaign } from '../db/repositories/characters'
import { assemblePartyMemberContext } from '../agents/partyMember'
import { computeHP } from '../engine/hp'
import { confirmNpcPromotion, inferArchetypeFromRole, recruitPartyMemberFromRoster } from './promotionIpc'

function seedNpc(role: string) {
  const db = createTestDb()
  const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
  const region = createRegion(db, { campaignId: campaign.id, name: 'Oakhollow', description: '...' })
  const npc = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Mira',
    role,
    disposition: 'friendly'
  })
  return { db, campaign, region, npc }
}

describe('inferArchetypeFromRole', () => {
  it('maps recognizable role keywords to an archetype', () => {
    expect(inferArchetypeFromRole('village guard')).toBe('fighter')
    expect(inferArchetypeFromRole('traveling merchant')).toBe('rogue')
    expect(inferArchetypeFromRole('temple healer')).toBe('cleric')
    expect(inferArchetypeFromRole('arcane scholar')).toBe('mage')
    expect(inferArchetypeFromRole('forest scout')).toBe('ranger')
  })

  it('falls back to fighter for an unrecognized role', () => {
    expect(inferArchetypeFromRole('wandering bard')).toBe('fighter')
  })
})

describe('confirmNpcPromotion conversion (011.3)', () => {
  it('creates an ai_party_member character sourced from the NPC, with engine-computed stats', () => {
    const { db, campaign, npc } = seedNpc('shopkeeper')

    const detail = confirmNpcPromotion(db, { campaignId: campaign.id, npcId: npc.id })

    const promoted = detail.characters.find((c) => c.sourceNpcId === npc.id)
    expect(promoted).toBeDefined()
    expect(promoted?.kind).toBe('ai_party_member')
    expect(promoted?.characterClass).toBe('rogue')
    expect(promoted?.hp).toBe(computeHP('rogue', 1, 15))
  })

  it('copies NPC alignment onto the promoted character when present', () => {
    const { db, campaign, region } = seedNpc('guard')
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Sergeant Vale',
      role: 'guard',
      disposition: 'stern',
      alignment: 'lawful_neutral',
      temperament: 'disciplined'
    })

    confirmNpcPromotion(db, { campaignId: campaign.id, npcId: npc.id })
    const promoted = listCharactersByCampaign(db, campaign.id).find((c) => c.sourceNpcId === npc.id)
    const stats = promoted?.stats as { temperament?: string } | undefined

    expect(promoted?.alignment).toBe('lawful_neutral')
    expect(stats?.temperament).toBe('disciplined')
  })
})

describe('confirmNpcPromotion guards and ownership (011.5)', () => {
  it('marks the original NPC row as promoted', () => {
    const { db, campaign, npc } = seedNpc('guard')

    confirmNpcPromotion(db, { campaignId: campaign.id, npcId: npc.id })

    expect(getNpcById(db, npc.id)?.isPartyMember).toBe(true)
  })

  it('throws for an unknown NPC id rather than silently doing nothing', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
    expect(() => confirmNpcPromotion(db, { campaignId: campaign.id, npcId: 'does-not-exist' })).toThrow()
  })

  it('sets owner_player_character_id when recruitingPlayerCharacterId is provided', () => {
    const { db, campaign, npc } = seedNpc('guard')
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player'
    })

    confirmNpcPromotion(db, {
      campaignId: campaign.id,
      npcId: npc.id,
      recruitingPlayerCharacterId: player.id
    })

    const promoted = listCharactersByCampaign(db, campaign.id).find((c) => c.sourceNpcId === npc.id)
    expect(promoted?.ownerPlayerCharacterId).toBe(player.id)
  })
})

describe('recruitPartyMemberFromRoster (038.13)', () => {
  it('transfers ownership from one player roster to another', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
    const playerA = createCharacter(db, {
      campaignId: campaign.id,
      name: 'A',
      characterClass: 'fighter',
      kind: 'player'
    })
    const playerB = createCharacter(db, {
      campaignId: campaign.id,
      name: 'B',
      characterClass: 'mage',
      kind: 'player'
    })
    const member = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Recruit',
      characterClass: 'rogue',
      kind: 'ai_party_member',
      ownerPlayerCharacterId: playerA.id
    })

    recruitPartyMemberFromRoster(db, {
      partyMemberId: member.id,
      recruitingPlayerCharacterId: playerB.id
    })

    expect(listCharactersByCampaign(db, campaign.id).find((c) => c.id === member.id)?.ownerPlayerCharacterId).toBe(
      playerB.id
    )
  })
})

describe('promotion memory carry-forward (011.4)', () => {
  it("includes the NPC's pre-promotion memories in the new party member's initial context", () => {
    const { db, campaign, npc } = seedNpc('shopkeeper')
    appendNpcMemory(db, { npcId: npc.id, content: 'Helped the party haggle for supplies.', tags: [] })

    confirmNpcPromotion(db, { campaignId: campaign.id, npcId: npc.id })
    const promoted = listCharactersByCampaign(db, campaign.id).find((c) => c.sourceNpcId === npc.id)!

    const context = assemblePartyMemberContext(db, campaign.id, promoted)

    expect(context.priorNpcMemories.length).toBeGreaterThanOrEqual(1)
    expect(context.priorNpcMemories.some((m) => m.content === 'Helped the party haggle for supplies.')).toBe(
      true
    )
  })
})
