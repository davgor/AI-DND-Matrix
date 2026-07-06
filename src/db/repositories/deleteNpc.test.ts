import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createCharacter } from './characters'
import { appendNpcMemory } from './npcMemories'
import { createNpc, getNpcById } from './npcs'
import { createRegion } from './regions'
import { deleteNpcCascade } from './deleteNpc'

function seedNpcFootprint(db: ReturnType<typeof createTestDb>, label: string) {
  const campaign = createCampaign(db, {
    name: `${label} Campaign`,
    premisePrompt: 'A test premise.',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: `${label} Region`,
    description: 'Description'
  })
  const npc = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: `${label} NPC`,
    role: 'guide',
    disposition: 'friendly'
  })
  appendNpcMemory(db, { npcId: npc.id, content: 'Memory', tags: ['test'] })
  const character = createCharacter(db, {
    campaignId: campaign.id,
    name: `${label} Hero`,
    characterClass: 'fighter',
    kind: 'player',
    sourceNpcId: npc.id
  })
  return { campaign, region, npc, character }
}

describe('deleteNpcCascade', () => {
  it('removes the NPC and memories without touching other NPCs', () => {
    const db = createTestDb()
    const target = seedNpcFootprint(db, 'Target')
    const other = seedNpcFootprint(db, 'Other')

    deleteNpcCascade(db, target.npc.id)

    expect(getNpcById(db, target.npc.id)).toBeUndefined()
    expect(getNpcById(db, other.npc.id)?.name).toBe('Other NPC')
    expect(
      (
        db.prepare('SELECT COUNT(*) as count FROM npc_memories WHERE npc_id = ?').get(target.npc.id) as {
          count: number
        }
      ).count
    ).toBe(0)

    const clearedCharacter = db
      .prepare('SELECT source_npc_id FROM characters WHERE id = ?')
      .get(target.character.id) as { source_npc_id: string | null }
    expect(clearedCharacter.source_npc_id).toBeNull()
  })

  it('rejects NPCs that do not exist', () => {
    const db = createTestDb()
    expect(() => deleteNpcCascade(db, 'missing-npc')).toThrow(/not found/i)
  })
})
