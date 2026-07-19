import { describe, expect, it } from 'vitest'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { resolvePlayerTurn } from '../main/turnIpc'
import { buildNarrationLog } from '../main/narrationLog'
import { filterDmExpositionEntries, filterSocialEntries } from '../shared/inCampaignLayout/sceneContext'
import { seedGameplayLoopSmokeCampaign } from './gameplayLoopSmokeFixtures'

// 040.2: intent + routing plan arrive from one merged LLM response.
function mergedTurn(intent: object, ...beats: object[]) {
  return JSON.stringify({ intent, routingPlan: { disposition: 'composite', beats } })
}

describe('gameplay loop smoke: converse turn', () => {
  it('returns NPC dialogue without redundant narration', async () => {
    const { db, campaign, player, shopkeeper } = seedGameplayLoopSmokeCampaign()
    const result = await resolvePlayerTurn(
      db,
      createScriptedProvider([
        mergedTurn({ checkNeeded: false }, { kind: 'npcResponse', npcIds: [shopkeeper.id] }),
        '{"dialogue":"Looking for something in particular?"}'
      ]),
      { campaignId: campaign.id, characterId: player.id, playerInput: 'Hello, do you sell rope?' },
      () => 0.5
    )
    expect(result.narrationText).toBe('')
    expect(result.npcReactions[0]?.text).toContain('Looking for something')
  })
})

describe('gameplay loop smoke: action expression turn', () => {
  it('stores bold player action prose', async () => {
    const { db, campaign, player } = seedGameplayLoopSmokeCampaign()
    const result = await resolvePlayerTurn(
      db,
      createScriptedProvider([
        mergedTurn(
          { checkNeeded: false },
          { kind: 'playerActionExpression', actionDescription: 'Kael hefts a coil of rope from the shelf.' }
        )
      ]),
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I pick up the rope' },
      () => 0.5
    )
    expect(result.playerActionText).toContain('rope')
  })
})

describe('gameplay loop smoke: narrated check turn', () => {
  it('narrates engine check outcomes and maps exposition speakers', async () => {
    const { db, campaign, player, shopkeeper } = seedGameplayLoopSmokeCampaign()
    await resolvePlayerTurn(
      db,
      createScriptedProvider([
        mergedTurn({ checkNeeded: false }, { kind: 'npcResponse', npcIds: [shopkeeper.id] }),
        '{"dialogue":"Evening."}'
      ]),
      { campaignId: campaign.id, characterId: player.id, playerInput: 'Hi' },
      () => 0.5
    )
    await resolvePlayerTurn(
      db,
      createScriptedProvider([
        mergedTurn(
          { checkNeeded: false },
          { kind: 'playerActionExpression', actionDescription: 'Kael hefts a coil of rope from the shelf.' }
        )
      ]),
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I pick up the rope' },
      () => 0.5
    )
    const check = await resolvePlayerTurn(
      db,
      createScriptedProvider([
        mergedTurn(
          { checkNeeded: true, ability: 'agility', dc: 12, proficient: false },
          { kind: 'dmNarration' }
        ),
        '{"narrationText":"The knot holds under your weight."}'
      ]),
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I test the knot' },
      () => 0.5
    )
    expect(check.narrationText).toContain('knot holds')
    expect(check.check).toBeDefined()

    const exposition = filterDmExpositionEntries(buildNarrationLog(db, campaign.id))
    expect(exposition.every((entry) => entry.speaker === 'dm')).toBe(true)
    expect(exposition.some((entry) => entry.playerLineKind === 'actionExpression')).toBe(false)

    const social = filterSocialEntries(buildNarrationLog(db, campaign.id))
    expect(social.map((entry) => entry.speaker)).toContain('npc')
    expect(social.some((entry) => entry.speaker === 'player' && entry.playerLineKind === 'raw')).toBe(
      true
    )
    expect(social.every((entry) => entry.speaker !== 'dm')).toBe(true)
    expect(social.every((entry) => entry.playerLineKind !== 'actionExpression')).toBe(true)
  })
})

describe('gameplay loop smoke: short-circuits', () => {
  it('does not regress rest, travel, or dying paths', async () => {
    const { db, campaign, player } = seedGameplayLoopSmokeCampaign()

    const rest = await resolvePlayerTurn(
      db,
      createScriptedProvider(['{"intent":{"checkNeeded":false,"actionType":"restShort"}}']),
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I rest' },
      () => 0.5
    )
    expect(rest.hpAfter).toBeDefined()

    const travel = await resolvePlayerTurn(
      db,
      createScriptedProvider(['{"intent":{"checkNeeded":false,"actionType":"travel","travelDays":2}}']),
      { campaignId: campaign.id, characterId: player.id, playerInput: 'We travel' },
      () => 0.5
    )
    expect(travel.inGameDateAfter).toBeGreaterThan(0)

    db.prepare("UPDATE characters SET hp = 0, stats = json_set(stats, '$.dyingState', json('{\"unconscious\":true,\"successStreak\":0,\"failureStreak\":0,\"stabilized\":false,\"lost\":false}')) WHERE id = ?").run(
      player.id
    )
    const dying = await resolvePlayerTurn(
      db,
      createScriptedProvider([]),
      { campaignId: campaign.id, characterId: player.id, playerInput: 'help' },
      () => 0.99
    )
    expect(dying.dyingResolution).toBeDefined()
  })
})
