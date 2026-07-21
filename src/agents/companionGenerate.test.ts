import { describe, expect, it } from 'vitest'
import { createScriptedProvider } from './providers/mockHarness'
import {
  buildCompanionGeneratePrompt,
  generateCompanionPreview,
  parseCompanionAgentProposal,
  type CompanionGenerateInput
} from './companionGenerate'
import type { CompanionGeneratePcContext } from '../shared/partyMembers/types'

const PC: CompanionGeneratePcContext = {
  playerCharacterId: 'pc-1',
  name: 'Asha',
  raceKey: 'human',
  backgroundKey: 'soldier',
  archetype: 'fighter',
  gearSummary: 'Longsword, Chain Hauberk'
}

const INPUT: CompanionGenerateInput = {
  prompt: 'A quiet elven scout who watches my back.',
  pc: PC,
  knownRaceKeys: ['human', 'elf'],
  knownInventoryItemIds: ['item-longsword', 'item-dagger']
}

const VALID_JSON = JSON.stringify({
  name: 'Bryn',
  characterClass: 'ranger',
  personality: 'Quiet scout who watches the treeline.',
  raceKey: 'elf',
  role: 'scout',
  appearance: { hairColor: 'auburn', age: 'young adult', eyeColor: 'green' },
  inventoryItemIds: ['item-longsword', 'item-unknown-junk'],
  abilityScores: { body: 20, agility: 3, mind: 99 }
})

describe('parseCompanionAgentProposal', () => {
  it('accepts a well-formed proposal object', () => {
    const parsed = parseCompanionAgentProposal(JSON.parse(VALID_JSON))
    expect(parsed?.name).toBe('Bryn')
    expect(parsed?.raceKey).toBe('elf')
  })

  it('rejects missing name or raceKey', () => {
    expect(parseCompanionAgentProposal({ name: 'x' })).toBeUndefined()
    expect(parseCompanionAgentProposal({ raceKey: 'elf', name: 1 })).toBeUndefined()
  })
})

describe('buildCompanionGeneratePrompt', () => {
  it('includes PC race/background/gear summary and the player prompt', () => {
    const text = buildCompanionGeneratePrompt(INPUT)
    expect(text).toContain('Asha')
    expect(text).toContain('human')
    expect(text).toContain('soldier')
    expect(text).toContain('Longsword')
    expect(text).toContain('quiet elven scout')
    expect(text).toContain('abilityScores')
  })
})

describe('generateCompanionPreview', () => {
  it('returns a clamped preview from a stub provider (stats ignored, unknown items dropped)', async () => {
    const provider = createScriptedProvider([VALID_JSON])
    const preview = await generateCompanionPreview(provider, INPUT)
    expect(preview.name).toBe('Bryn')
    expect(preview.raceKey).toBe('elf')
    expect(preview.ownerPlayerCharacterId).toBe('pc-1')
    expect(preview.inventoryItemIds).toEqual(['item-longsword'])
    expect(preview && 'abilityScores' in preview).toBe(false)
    expect(preview.pcContextDigest).toContain('Asha')
    expect(provider.calls[0]?.context?.purpose).toBe('onboarding.companion_generate')
  })

  it('rewrites unknown race keys to human', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({
        name: 'Kai',
        characterClass: 'rogue',
        personality: 'Sly',
        raceKey: 'dragon-god'
      })
    ])
    const preview = await generateCompanionPreview(provider, INPUT)
    expect(preview.raceKey).toBe('human')
  })

  it('does not persist anything — preview-only (no DB side effects in agent)', async () => {
    const provider = createScriptedProvider([VALID_JSON, VALID_JSON])
    const first = await generateCompanionPreview(provider, INPUT)
    const second = await generateCompanionPreview(provider, {
      ...INPUT,
      prompt: 'Same prompt regenerate'
    })
    expect(first.name).toBe('Bryn')
    expect(second.name).toBe('Bryn')
    expect(provider.calls).toHaveLength(2)
  })
})
