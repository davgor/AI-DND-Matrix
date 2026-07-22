import { describe, expect, it } from 'vitest'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter, getCharacterById } from '../db/repositories/characters'
import { createRegion } from '../db/repositories/regions'
import { resolvePlayerTurnForIpc, resetTurnAttemptLedgerForTests } from './turnResolveRecovery'

function fixedRng(value: number) {
  return () => value
}

function seedRetryCampaign() {
  const db = createTestDb()
  const campaign = createCampaign(db, { name: 'Retry', premisePrompt: 'x', deathMode: 'legendary' })
  createRegion(db, { campaignId: campaign.id, name: 'Camp', description: 'Quiet.' })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    characterClass: 'fighter',
    kind: 'player',
    hp: 5,
    level: 1,
    stats: { abilityScores: { body: 12, agility: 14, mind: 10, presence: 10 }, ac: 12, maxHp: 20, hitDieRolls: [10] }
  })
  return { db, campaign, player }
}

describe('resolvePlayerTurnForIpc retryable idempotency', () => {
  it('applies HP once when provider fails before mutations then retries with same turnAttemptId', async () => {
    resetTurnAttemptLedgerForTests()
    const { db, campaign, player } = seedRetryCampaign()
    const turnAttemptId = 'attempt-rest-retry'
    const turnInput = {
      campaignId: campaign.id,
      characterId: player.id,
      playerInput: 'I catch my breath',
      turnAttemptId
    }
    const provider = createScriptedProvider([
      new Error('provider offline'),
      JSON.stringify({ intent: { checkNeeded: false, actionType: 'restShort' } })
    ])

    const failed = await resolvePlayerTurnForIpc(db, provider, turnInput, fixedRng(0.5))
    expect(failed.ok).toBe(false)
    if (failed.ok) {
      throw new Error('expected failure')
    }
    expect(failed.retryable).toBe(true)
    expect(getCharacterById(db, player.id)?.hp).toBe(5)

    const succeeded = await resolvePlayerTurnForIpc(db, provider, turnInput, fixedRng(0.5))
    expect(succeeded.ok).toBe(true)
    if (!succeeded.ok) {
      throw new Error('expected success')
    }
    const hpAfterRetry = getCharacterById(db, player.id)?.hp ?? 0
    expect(hpAfterRetry).toBeGreaterThan(5)

    const cached = await resolvePlayerTurnForIpc(db, provider, turnInput, fixedRng(0.5))
    expect(cached.ok).toBe(true)
    expect(provider.calls).toHaveLength(2)
    expect(getCharacterById(db, player.id)?.hp).toBe(hpAfterRetry)

    db.close()
  })
})

describe('resolvePlayerTurnForIpc non-retryable failure', () => {
  it('returns non-retryable failure after mutations and abort keeps prior save state', async () => {
    resetTurnAttemptLedgerForTests()
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Abort', premisePrompt: 'x', deathMode: 'legendary' })
    createRegion(db, { campaignId: campaign.id, name: 'Gate', description: 'Guards.' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Kael',
      characterClass: 'fighter',
      kind: 'player',
      hp: 5,
      level: 1,
      stats: { abilityScores: { body: 12, agility: 14, mind: 10, presence: 10 }, ac: 12, maxHp: 20, hitDieRolls: [10] }
    })
    const turnAttemptId = 'attempt-routed-fail'
    const turnInput = {
      campaignId: campaign.id,
      characterId: player.id,
      playerInput: 'I sneak past the guard',
      turnAttemptId
    }
    const merged = JSON.stringify({
      intent: { checkNeeded: true, ability: 'agility', dc: 10, proficient: false },
      routingPlan: { disposition: 'composite', beats: [{ kind: 'dmNarration' }] }
    })
    const provider = createScriptedProvider([merged, new Error('narration offline')])
    const hpBefore = getCharacterById(db, player.id)?.hp ?? 0

    const failed = await resolvePlayerTurnForIpc(db, provider, turnInput, fixedRng(0.5))
    expect(failed.ok).toBe(false)
    if (failed.ok) {
      throw new Error('expected failure')
    }
    expect(failed.retryable).toBe(false)
    expect(getCharacterById(db, player.id)?.hp).toBe(hpBefore)

    const blockedRetry = await resolvePlayerTurnForIpc(db, provider, turnInput, fixedRng(0.5))
    expect(blockedRetry.ok).toBe(false)
    if (blockedRetry.ok) {
      throw new Error('expected blocked retry')
    }
    expect(blockedRetry.retryable).toBe(false)
    expect(provider.calls).toHaveLength(2)

    db.close()
  })
})
