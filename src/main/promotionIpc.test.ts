import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { appendNpcMemory } from '../db/repositories/npcMemories'
import { createNpc, getNpcById } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { listCharactersByCampaign } from '../db/repositories/characters'
import { assemblePartyMemberContext } from '../agents/partyMember'
import { computeHP } from '../engine/hp'
import { confirmNpcPromotion, inferArchetypeFromRole } from './promotionIpc'

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

describe('confirmNpcPromotion (011.3 conversion + 011.5 mark promoted)', () => {
  it('creates an ai_party_member character sourced from the NPC, with engine-computed stats', () => {
    const { db, campaign, npc } = seedNpc('shopkeeper')

    const detail = confirmNpcPromotion(db, { campaignId: campaign.id, npcId: npc.id })

    const promoted = detail.characters.find((c) => c.sourceNpcId === npc.id)
    expect(promoted).toBeDefined()
    expect(promoted?.kind).toBe('ai_party_member')
    expect(promoted?.characterClass).toBe('rogue')
    expect(promoted?.hp).toBe(computeHP('rogue', 1, 15))
  })

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
