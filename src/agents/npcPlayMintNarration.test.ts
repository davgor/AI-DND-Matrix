import type Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createLogEntry } from '../db/repositories/logEntries'
import { listNpcsByRegion, updateNpcOpinionSummary } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { assembleNarrationContext, narrate, persistNarrationSideEffects } from './dm'
import { listPersonMatchCandidates } from '../main/journalIpc'
import { persistNpcPlayMintSideEffects } from './npcPlayMintNarration'
import { MAX_NPC_PROPOSALS_PER_TURN, type NpcProposal } from '../shared/playPopulation'
import { createScriptedProvider } from './providers/mockHarness'
import type { CheckOutcome } from './dm'

const bartenderProposal: NpcProposal = {
  key: 'barkeep-tom',
  name: 'Tom',
  role: 'barkeeper',
  disposition: 'gruff but fair',
  raceKey: 'human',
  genderKey: 'man',
  classKey: 'commoner',
  alignment: 'true_neutral',
  backstory: 'Runs the taproom.',
  purpose: 'introduced_in_scene'
}

function seedScene(db: Database.Database) {
  const campaign = createCampaign(db, {
    name: 'Tavern',
    premisePrompt: 'Drinks and deals',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Harbor Inn',
    description: 'A busy taproom'
  })
  const hero = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Aria',
    characterClass: 'rogue',
    kind: 'player'
  })
  return { campaign, region, hero }
}

describe('persistNpcPlayMintSideEffects mint dedupe', () => {
  it('persists a speaking NPC in the turn region and skips duplicates', () => {
    const db = createTestDb()
    const { campaign, region, hero } = seedScene(db)

    persistNpcPlayMintSideEffects(
      db,
      {
        npcProposals: [bartenderProposal]
      },
      { campaignId: campaign.id, regionId: region.id, characterId: hero.id }
    )

    const listed = listNpcsByRegion(db, region.id)
    expect(listed).toHaveLength(1)
    expect(listed[0]?.name).toBe('Tom')
    expect(listed[0]?.raceKey).toBe('human')
    expect(listed[0]?.genderKey).toBe('man')
    expect(listed[0]?.classKey).toBe('commoner')

    persistNpcPlayMintSideEffects(
      db,
      {
        npcProposals: [{ ...bartenderProposal, name: 'Tom', backstory: 'noop' }]
      },
      { campaignId: campaign.id, regionId: region.id, characterId: hero.id }
    )

    expect(listNpcsByRegion(db, region.id)).toHaveLength(1)
    expect(listNpcsByRegion(db, region.id)[0]?.name).toBe('Tom')
  })
})

describe('persistNpcPlayMintSideEffects mint clamp', () => {
  it(`clamps to ${MAX_NPC_PROPOSALS_PER_TURN} mints per turn`, () => {
    const db = createTestDb()
    const { campaign, region, hero } = seedScene(db)

    persistNpcPlayMintSideEffects(
      db,
      {
        npcProposals: [
          bartenderProposal,
          { ...bartenderProposal, key: 'server-sam', name: 'Sam' },
          { ...bartenderProposal, key: 'server-uma', name: 'Uma' }
        ]
      },
      { campaignId: campaign.id, regionId: region.id, characterId: hero.id }
    )

    expect(listNpcsByRegion(db, region.id)).toHaveLength(MAX_NPC_PROPOSALS_PER_TURN)
  })
})

describe('persistNpcPlayMintSideEffects mint region fallback', () => {
  it('ignores unknown region FK and falls back to turn region', () => {
    const db = createTestDb()
    const { campaign, region, hero } = seedScene(db)

    persistNpcPlayMintSideEffects(
      db,
      {
        npcProposals: [{ ...bartenderProposal, regionId: 'missing-region' }]
      },
      { campaignId: campaign.id, regionId: region.id, characterId: hero.id }
    )

    expect(listNpcsByRegion(db, region.id)).toHaveLength(1)
  })
})

describe('persistNpcPlayMintSideEffects presentNpcs grounding', () => {
  it('grounds minted NPC in presentNpcs but excludes from personCandidates until meet rules', async () => {
    const db = createTestDb()
    const { campaign, region, hero } = seedScene(db)

    await persistNarrationSideEffects(
      db,
      { narrationText: 'A barkeeper appears.', npcProposals: [bartenderProposal] },
      { campaignId: campaign.id, regionId: region.id, characterId: hero.id }
    )

    const minted = listNpcsByRegion(db, region.id)[0]!
    expect(
      listPersonMatchCandidates(db, { campaignId: campaign.id, characterId: hero.id })
    ).toEqual([])

    const context = await assembleNarrationContext({
      db,
      campaignId: campaign.id,
      regionId: region.id,
      characterId: hero.id,
      playerInput: 'Hello barkeeper'
    })
    expect(context.presentNpcs).toEqual([
      { id: minted.id, name: 'Tom', isHostile: false, alive: true }
    ])

    updateNpcOpinionSummary(db, minted.id, {
      summary: 'Gruff but fair.',
      generatedAt: '2026-07-21T12:00:00.000Z'
    })
    expect(
      listPersonMatchCandidates(db, { campaignId: campaign.id, characterId: hero.id })
    ).toEqual([{ npcId: minted.id, name: 'Tom' }])
  })
})

describe('persistNpcPlayMintSideEffects log-book person link', () => {
  it('includes minted NPC in personCandidates after log-book person link', async () => {
    const db = createTestDb()
    const { campaign, region, hero } = seedScene(db)

    await persistNarrationSideEffects(
      db,
      { narrationText: 'A barkeeper appears.', npcProposals: [bartenderProposal] },
      { campaignId: campaign.id, regionId: region.id, characterId: hero.id }
    )

    const minted = listNpcsByRegion(db, region.id)[0]!
    createLogEntry(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      category: 'person',
      title: 'Tom',
      content: 'Met the barkeeper.',
      relatedEntityId: minted.id,
      learnedInGameDate: 1
    })

    expect(
      listPersonMatchCandidates(db, { campaignId: campaign.id, characterId: hero.id })
    ).toEqual([{ npcId: minted.id, name: 'Tom' }])
  })
})

describe('narrate npcProposals parse (134.3)', () => {
  it('parses typed npcProposals from stub provider JSON', async () => {
    const db = createTestDb()
    const { campaign, region, hero } = seedScene(db)
    const outcome: CheckOutcome = { success: true, total: 12, dc: 10 }
    const context = await assembleNarrationContext({
      db,
      campaignId: campaign.id,
      regionId: region.id,
      characterId: hero.id,
      playerInput: 'I look for the barkeeper'
    })
    const provider = createScriptedProvider([
      JSON.stringify({
        narrationText: 'A barkeeper wipes the counter.',
        npcProposals: [bartenderProposal]
      })
    ])

    const result = await narrate(provider, outcome, context)
    expect(result.npcProposals).toEqual([bartenderProposal])

    await persistNarrationSideEffects(db, result, {
      campaignId: campaign.id,
      regionId: region.id,
      characterId: hero.id
    })
    expect(listNpcsByRegion(db, region.id).map((npc) => npc.name)).toEqual(['Tom'])
  })
})

describe('persistNarrationSideEffects npcProposals integration', () => {
  it('persists mint through the narration side-effect pipeline', async () => {
    const db = createTestDb()
    const { campaign, region, hero } = seedScene(db)

    await persistNarrationSideEffects(
      db,
      { narrationText: 'A stranger enters.', npcProposals: [bartenderProposal] },
      { campaignId: campaign.id, regionId: region.id, characterId: hero.id }
    )

    expect(listNpcsByRegion(db, region.id).map((npc) => npc.name)).toEqual(['Tom'])
  })
})
