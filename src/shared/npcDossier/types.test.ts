import { describe, expect, it } from 'vitest'
import {
  DOSSIER_SECTION_ORDER,
  isNpcDossierDto,
  isNpcDossierFact,
  isNpcDossierOpinion,
  isNpcDossierSection,
  isNpcDossierTraits,
  needsOpinionRegeneration,
  parseNpcDossierDto,
  parseNpcDossierSection,
  type NpcDossierDto
} from './types'

describe('dossier section order', () => {
  it('locks Traits → Facts → Opinion → Disposition', () => {
    expect(DOSSIER_SECTION_ORDER).toEqual(['traits', 'facts', 'opinion', 'disposition'])
  })

  it('isNpcDossierSection accepts only known sections', () => {
    expect(isNpcDossierSection('traits')).toBe(true)
    expect(isNpcDossierSection('facts')).toBe(true)
    expect(isNpcDossierSection('opinion')).toBe(true)
    expect(isNpcDossierSection('disposition')).toBe(true)
    expect(isNpcDossierSection('backstory')).toBe(false)
    expect(isNpcDossierSection(1)).toBe(false)
  })

  it('parseNpcDossierSection round-trips valid keys', () => {
    expect(parseNpcDossierSection('opinion')).toBe('opinion')
    expect(parseNpcDossierSection('nope')).toBeUndefined()
  })
})

describe('needsOpinionRegeneration', () => {
  it('returns true when no summary exists yet', () => {
    expect(
      needsOpinionRegeneration({
        opinionSummary: null,
        opinionSummaryGeneratedAt: null,
        lastPlayerInteractionAt: null
      })
    ).toBe(true)
  })

  it('returns false when interaction watermark is at or before generation time', () => {
    expect(
      needsOpinionRegeneration({
        opinionSummary: 'Wary but polite.',
        opinionSummaryGeneratedAt: '2026-07-20T12:00:00.000Z',
        lastPlayerInteractionAt: '2026-07-20T11:00:00.000Z'
      })
    ).toBe(false)
    expect(
      needsOpinionRegeneration({
        opinionSummary: 'Wary but polite.',
        opinionSummaryGeneratedAt: '2026-07-20T12:00:00.000Z',
        lastPlayerInteractionAt: '2026-07-20T12:00:00.000Z'
      })
    ).toBe(false)
  })

  it('returns true when interaction watermark advances past generation time', () => {
    expect(
      needsOpinionRegeneration({
        opinionSummary: 'Wary but polite.',
        opinionSummaryGeneratedAt: '2026-07-20T12:00:00.000Z',
        lastPlayerInteractionAt: '2026-07-20T13:00:00.000Z'
      })
    ).toBe(true)
  })

  it('returns false when summary exists but interaction watermark is null', () => {
    expect(
      needsOpinionRegeneration({
        opinionSummary: 'Neutral.',
        opinionSummaryGeneratedAt: '2026-07-20T12:00:00.000Z',
        lastPlayerInteractionAt: null
      })
    ).toBe(false)
  })
})

describe('dossier DTO guards', () => {
  const validDto: NpcDossierDto = {
    npcId: 'npc-1',
    name: 'Mira',
    role: 'innkeeper',
    canSpeak: true,
    traits: {
      temperament: 'friendly',
      raceKey: 'human',
      alignment: 'neutral_good',
      genderKey: 'female',
      classKey: null,
      backgroundKey: 'merchant',
      role: 'innkeeper'
    },
    facts: [{ id: 'log-1', title: 'Mira', content: 'Runs the Oak & Ember.', createdAt: '2026-07-01T00:00:00.000Z' }],
    opinion: {
      summary: 'Glad the party stopped by.',
      generatedAt: '2026-07-20T12:00:00.000Z',
      stale: false
    },
    disposition: 'warm toward the party'
  }

  it('accepts a well-formed dossier DTO', () => {
    expect(isNpcDossierDto(validDto)).toBe(true)
    expect(parseNpcDossierDto(validDto)).toEqual(validDto)
  })

  it('rejects malformed traits, facts, or opinion', () => {
    expect(isNpcDossierTraits({ temperament: 1 })).toBe(false)
    expect(isNpcDossierFact({ id: 'x', title: 't' })).toBe(false)
    expect(isNpcDossierOpinion({ summary: 'ok', generatedAt: null, stale: 'no' })).toBe(false)
    expect(isNpcDossierDto({ ...validDto, facts: [{ title: 'missing id' }] })).toBe(false)
    expect(parseNpcDossierDto({ ...validDto, npcId: 1 })).toBeUndefined()
  })
})
