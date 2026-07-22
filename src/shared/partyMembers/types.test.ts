import { describe, expect, it } from 'vitest'
import { isLlmPurposeId } from '../llmUsage/types'
import {
  COMPANION_FACE_TOKEN_ENTITY_KIND,
  COMPANION_GENERATE_LLM_PURPOSE,
  COMPANION_ONBOARDING_MAX,
  COMPANION_ORDER_MAX_CHARS,
  COMPANIONS_GUIDED_PHASE,
  COMPANIONS_PHASE_AFTER,
  COMPANIONS_PHASE_BEFORE,
  COMPANIONS_PHASE_ORDER_SLICE,
  clampCompanionProposal,
  companionIdentityDigestFromPreview,
  companionIdentityDigestFromMember,
  isCompanionPreviewDto,
  parseCompanionPreviewDto,
  shouldEnqueueCompanionFaceToken,
  type CompanionAgentProposal,
  type CompanionGeneratePcContext,
  type CompanionPreviewDto
} from './types'

const PC: CompanionGeneratePcContext = {
  playerCharacterId: 'pc-1',
  name: 'Asha',
  raceKey: 'human',
  backgroundKey: 'soldier',
  archetype: 'fighter',
  gearSummary: 'Longsword, Chain Hauberk'
}

const VALID_PROPOSAL: CompanionAgentProposal = {
  name: 'Bryn',
  characterClass: 'ranger',
  personality: 'Quiet scout who watches the treeline.',
  raceKey: 'elf',
  role: 'scout',
  appearance: { hairColor: 'auburn', age: 'young adult', eyeColor: 'green' },
  inventoryItemIds: ['item-longsword', 'item-unknown-junk'],
  abilityScores: { body: 20, agility: 3, mind: 99 }
}

const VALID_PREVIEW: CompanionPreviewDto = {
  name: 'Bryn',
  characterClass: 'ranger',
  personality: 'Quiet scout.',
  raceKey: 'elf',
  role: 'scout',
  appearance: { hairColor: 'auburn', age: 'young adult', eyeColor: 'green' },
  inventoryItemIds: ['item-longsword'],
  ownerPlayerCharacterId: 'pc-1',
  pcContextDigest: 'Asha · human · soldier · fighter'
}

describe('companions phase contract', () => {
  it('locks phase name between equipment and identity', () => {
    expect(COMPANIONS_GUIDED_PHASE).toBe('companions')
    expect(COMPANIONS_PHASE_AFTER).toBe('equipment')
    expect(COMPANIONS_PHASE_BEFORE).toBe('identity')
    expect(COMPANIONS_PHASE_ORDER_SLICE).toEqual(['equipment', 'companions', 'identity'])
  })

  it('locks v1 onboarding max companions at 1', () => {
    expect(COMPANION_ONBOARDING_MAX).toBe(1)
  })

  it('locks face-token entity kind to ai_party_member', () => {
    expect(COMPANION_FACE_TOKEN_ENTITY_KIND).toBe('ai_party_member')
  })

  it('locks generate metering purpose under onboarding and in LLM taxonomy', () => {
    expect(COMPANION_GENERATE_LLM_PURPOSE).toBe('onboarding.companion_generate')
    expect(isLlmPurposeId(COMPANION_GENERATE_LLM_PURPOSE)).toBe(true)
  })
})

describe('clampCompanionPreview', () => {
  it('returns preview with engine-owned stats (agent abilityScores ignored)', () => {
    const preview = clampCompanionProposal(VALID_PROPOSAL, PC, {
      knownRaceKeys: ['human', 'elf'],
      knownInventoryItemIds: ['item-longsword']
    })
    expect(preview).not.toBeNull()
    expect(preview?.name).toBe('Bryn')
    expect(preview?.raceKey).toBe('elf')
    expect(preview?.ownerPlayerCharacterId).toBe('pc-1')
    expect(preview && 'abilityScores' in preview).toBe(false)
    expect(preview?.inventoryItemIds).toEqual(['item-longsword'])
    expect(preview?.pcContextDigest).toContain('Asha')
  })
})

describe('clampCompanionRaceAndName', () => {
  it('rewrites unknown race keys to human and drops blank names', () => {
    expect(
      clampCompanionProposal(
        { ...VALID_PROPOSAL, name: '   ', raceKey: 'dragon-god' },
        PC,
        { knownRaceKeys: ['human', 'elf'], knownInventoryItemIds: [] }
      )
    ).toBeNull()

    const preview = clampCompanionProposal(
      { ...VALID_PROPOSAL, raceKey: 'dragon-god' },
      PC,
      { knownRaceKeys: ['human', 'elf'], knownInventoryItemIds: [] }
    )
    expect(preview?.raceKey).toBe('human')
  })
})

describe('clampCompanionLengthBounds', () => {
  it('trims personality and locks order max chars', () => {
    const preview = clampCompanionProposal(
      { ...VALID_PROPOSAL, personality: 'x'.repeat(2000) },
      PC,
      { knownRaceKeys: ['elf'], knownInventoryItemIds: [] }
    )
    expect(preview?.personality.length).toBeLessThanOrEqual(500)
    expect(COMPANION_ORDER_MAX_CHARS).toBe(200)
  })
})

describe('companion preview guards', () => {
  it('accepts a well-formed preview DTO', () => {
    expect(isCompanionPreviewDto(VALID_PREVIEW)).toBe(true)
    expect(parseCompanionPreviewDto(VALID_PREVIEW)).toEqual(VALID_PREVIEW)
  })

  it('rejects malformed previews', () => {
    expect(isCompanionPreviewDto({ ...VALID_PREVIEW, name: 1 })).toBe(false)
    expect(parseCompanionPreviewDto({ ...VALID_PREVIEW, inventoryItemIds: 'x' })).toBeUndefined()
  })

  it('builds a slim identity digest for DM interview grounding', () => {
    expect(companionIdentityDigestFromPreview(VALID_PREVIEW)).toEqual({
      name: 'Bryn',
      role: 'scout',
      raceKey: 'elf',
      characterClass: 'ranger'
    })
  })

  it('reads companionRole from member stats when present', () => {
    expect(
      companionIdentityDigestFromMember({
        name: 'Bryn',
        characterClass: 'ranger',
        raceKey: 'elf',
        stats: { companionRole: 'scout' }
      })
    ).toEqual({
      name: 'Bryn',
      role: 'scout',
      raceKey: 'elf',
      characterClass: 'ranger'
    })
  })
})

describe('companion face-token enqueue policy', () => {
  it('never enqueues when toggle is off; may enqueue when on', () => {
    expect(shouldEnqueueCompanionFaceToken(false)).toBe(false)
    expect(shouldEnqueueCompanionFaceToken(true)).toBe(true)
  })

  it('skips companions that already have a face token when toggle is ON', () => {
    expect(shouldEnqueueCompanionFaceToken(true, { hasFaceToken: true })).toBe(false)
    expect(shouldEnqueueCompanionFaceToken(true, { hasFaceToken: false })).toBe(true)
    expect(shouldEnqueueCompanionFaceToken(false, { hasFaceToken: false })).toBe(false)
  })
})
