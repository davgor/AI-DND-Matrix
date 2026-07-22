import { describe, expect, it } from 'vitest'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { generateNpcReaction, assembleNpcContext } from '../agents/npc'
import {
  assembleNarrationContext,
  narrate,
  persistNarrationSideEffects
} from '../agents/dm'
import { setCharacterAlignment } from './repositories/characterAlignment'
import { resolvePlayerTurn } from '../main/turnIpc'
import { buildNarrationLog } from '../main/narrationLog'
import { seedAlignmentSmokeCampaign } from './alignmentSmokeFixtures'
import { appendEvent } from './repositories/events'

describe('alignment smoke: setup and shift flow', () => {
  it('persists alignment from character setup', async () => {
    const { player } = seedAlignmentSmokeCampaign()
    expect(player.alignment).toBe('lawful_good')
  })

  it('flags pending alignment warning then commits on continued play', async () => {
    const { db, campaign, player } = seedAlignmentSmokeCampaign()
    setCharacterAlignment(db, player.id, 'lawful_good')

    await resolvePlayerTurn(
      db, 
      createScriptedProvider([
        JSON.stringify({
          intent: { checkNeeded: false },
          routingPlan: { disposition: 'narrate', beats: [{ kind: 'dmNarration' }] }
        }),
        JSON.stringify({
          narrationText: 'The shrine offers no resistance.',
          alignmentShiftWarning: {
            proposedAlignment: 'neutral_evil',
            warningText: 'Looting this shrine may mean you are no longer Lawful Good if you continue.'
          }
        })
      ]), 
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I loot the shrine' }, { rng: () => 10 })

    const afterWarn = db
      .prepare('SELECT pending_alignment_shift FROM characters WHERE id = ?')
      .get(player.id) as { pending_alignment_shift: string }
    expect(afterWarn.pending_alignment_shift).toContain('neutral_evil')

    const result = await resolvePlayerTurn(
      db, 
      createScriptedProvider([
        JSON.stringify({
          intent: { checkNeeded: false },
          routingPlan: { disposition: 'narrate', beats: [{ kind: 'dmNarration' }] }
        }),
        JSON.stringify({
          narrationText: 'You take the relic.',
          commitAlignmentShift: { newAlignment: 'neutral_evil' }
        })
      ]), 
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I take everything' }, { rng: () => 10 })

    expect(result.pendingAlignmentShift).toBeNull()
    expect(result.alignmentShiftCommitted).toBe('neutral_evil')
  })
})

describe('alignment smoke: non-speaking creatures', async () => {
  it('renders non-speaking NPC actions as action kind in narration log', async () => {
    const { db, campaign, player, wolfNpc } = seedAlignmentSmokeCampaign()
    const context = await assembleNpcContext(db, wolfNpc)
    const reaction = await generateNpcReaction(
      createScriptedProvider([
        JSON.stringify({ actionDescription: '**The wolf lunges at your throat.**', attack: true })
      ]),
      wolfNpc,
      context,
      'You enter the den.'
    )
    expect(reaction.reactionKind).toBe('action')

    await resolvePlayerTurn(
      db, 
      createScriptedProvider([
        JSON.stringify({
          intent: { checkNeeded: false },
          routingPlan: {
            disposition: 'composite',
            beats: [{ kind: 'dmNarration' }, { kind: 'npcResponse', npcIds: [wolfNpc.id] }]
          }
        }),
        JSON.stringify({ narrationText: 'A wolf attacks.' }),
        JSON.stringify({ actionDescription: '**The wolf lunges.**' })
      ]), 
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I approach' }, { rng: () => 1 })

    appendEvent(db, {
      campaignId: campaign.id,
      type: 'npc_reaction',
      payload: { npcId: wolfNpc.id, text: '**The wolf lunges.**', reactionKind: 'action' }
    })

    const actionLine = buildNarrationLog(db, campaign.id).find((entry) => entry.reactionKind === 'action')
    expect(actionLine?.text).toBe('The wolf lunges.')
  })
})

describe('alignment smoke: narration context', async () => {
  it('includes alignment and pending shift in narration context', async () => {
    const { db, campaign, region, player } = seedAlignmentSmokeCampaign()
    const context = await assembleNarrationContext({
      db,
      campaignId: campaign.id,
      regionId: region.id,
      characterId: player.id,
      playerInput: 'I pray at the shrine'
    })
    expect(context.playerAlignment).toBe('lawful_good')

    const result = await narrate(
      createScriptedProvider([
        JSON.stringify({
          narrationText: 'The shrine glows.',
          alignmentShiftWarning: {
            proposedAlignment: 'chaotic_good',
            warningText: 'Breaking the seal may change who you are.'
          }
        })
      ]),
      { success: true, total: 12, dc: 10 },
      context
    )
    await persistNarrationSideEffects(db, result, {
      campaignId: campaign.id,
      regionId: region.id,
      characterId: player.id
    })
    const refreshed = await assembleNarrationContext({
      db,
      campaignId: campaign.id,
      regionId: region.id,
      characterId: player.id,
      playerInput: 'continue'
    })
    expect(refreshed.pendingAlignmentShift?.proposedAlignment).toBe('chaotic_good')
  })
})
