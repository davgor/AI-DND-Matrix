import type Database from 'better-sqlite3'
import { describe, expect, it, vi } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import {
  getBestiarySpeciesById,
  listBestiarySpecies,
  listQuestFoeAssignments
} from '../db/repositories/bestiary'
import { createScriptedProvider } from './providers/mockHarness'
import { persistQuestNarrationSideEffects } from './questNarration'
import type { QuestProposal } from './questNarration'

function seedPlayer(db: Database.Database): { campaignId: string; characterId: string } {
  const campaign = createCampaign(db, { name: 'Q', premisePrompt: 'Hook', deathMode: 'legendary' })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Hero',
    characterClass: 'fighter',
    kind: 'player',
    level: 3
  })
  return { campaignId: campaign.id, characterId: player.id }
}

const RIFT_PROPOSAL: QuestProposal = {
  kind: 'side',
  title: 'Clear the rift-beasts from the rift',
  summary: 'Drive the pack back through the tear.',
  scale: 'minor'
}

describe('persistQuestNarrationSideEffects foe assignment', () => {
  it('assigns rift-beast foes on propose without starting combat', async () => {
    const db = createTestDb()
    const ids = seedPlayer(db)
    const provider = createScriptedProvider([])

    await persistQuestNarrationSideEffects(
      db,
      { narrationText: 'A ranger offers a job.', questProposals: [RIFT_PROPOSAL] },
      { ...ids, provider }
    )

    const questRow = db.prepare('SELECT id FROM quests WHERE kind = ?').get('side') as { id: string }
    const assignments = listQuestFoeAssignments(db, questRow.id)
    expect(assignments.length).toBeGreaterThanOrEqual(1)

    const species = getBestiarySpeciesById(db, assignments[0]!.speciesId)!
    expect(species.key === 'rift-beast' || /rift/.test(species.name.toLowerCase())).toBe(true)
    expect(listBestiarySpecies(db, ids.campaignId).some((s) => s.id === species.id)).toBe(true)
    expect(db.prepare('SELECT COUNT(*) AS c FROM combat_encounters').get()).toEqual({ c: 0 })
  })

  it('generates missing species into the campaign bestiary', async () => {
    const db = createTestDb()
    const ids = seedPlayer(db)
    const provider = createScriptedProvider([])
    expect(listBestiarySpecies(db, ids.campaignId)).toHaveLength(0)

    await persistQuestNarrationSideEffects(
      db,
      { narrationText: 'A job.', questProposals: [RIFT_PROPOSAL] },
      { ...ids, provider }
    )

    expect(listBestiarySpecies(db, ids.campaignId).some((s) => s.key === 'rift-beast')).toBe(true)
  })

  it('does not call startEncounter during propose', async () => {
    const startEncounter = vi.fn()
    const db = createTestDb()
    const ids = seedPlayer(db)
    const provider = createScriptedProvider([])

    await persistQuestNarrationSideEffects(
      db,
      { narrationText: 'A job.', questProposals: [RIFT_PROPOSAL] },
      { ...ids, provider }
    )

    expect(startEncounter).not.toHaveBeenCalled()
    const questId = (db.prepare('SELECT id FROM quests LIMIT 1').get() as { id: string }).id
    expect(listQuestFoeAssignments(db, questId).length).toBeGreaterThan(0)
  })
})
