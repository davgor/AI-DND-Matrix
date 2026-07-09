import { NARRATIVE_EMPHASIS_GUIDANCE, NPC_EMPHASIS_GUIDANCE } from '../../../shared/textEmphasis'
import { createScriptedProvider } from '../../../agents/providers/mockHarness'
import { assembleNarrationContext, narrate } from '../../../agents/dm'
import { assembleNpcContext, generateNpcReaction } from '../../../agents/npc'
import { createTestDb } from '../../../db/testUtils'
import { createCampaign } from '../../../db/repositories/campaigns'
import { createCharacter } from '../../../db/repositories/characters'
import { createNpc } from '../../../db/repositories/npcs'
import { createRegion } from '../../../db/repositories/regions'
import { expect } from 'vitest'

export async function expectEmphasisGuidanceInPrompts(): Promise<void> {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Smoke',
    premisePrompt: 'Test',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Town',
    description: 'Quiet.'
  })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Hero',
    characterClass: 'fighter',
    kind: 'player'
  })
  const npc = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Guide',
    role: 'villager',
    disposition: 'friendly'
  })

  const dmProvider = createScriptedProvider([JSON.stringify({ narrationText: 'All clear.' })])
  const context = assembleNarrationContext({
    db,
    campaignId: campaign.id,
    regionId: region.id,
    characterId: player.id,
    playerInput: 'Look around'
  })
  await narrate(dmProvider, { success: true, total: 10, dc: 10 }, context)
  // Emphasis guidance moved from the user prompt to systemPrompt (ticket 040.9)
  expect(dmProvider.calls[0]?.context?.systemPrompt).toContain(NARRATIVE_EMPHASIS_GUIDANCE)

  const npcProvider = createScriptedProvider(['{"dialogue":"*Hello.*"}'])
  await generateNpcReaction(npcProvider, npc, assembleNpcContext(db, npc), 'The hero arrives.')
  expect(npcProvider.calls[0]?.context?.systemPrompt).toContain(NPC_EMPHASIS_GUIDANCE)
}
