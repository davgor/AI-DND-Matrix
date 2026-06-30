import { describe, expect, it } from 'vitest'
import { hasArcaneOption, hasMartialOption, resolveLevelUpPerks } from './levelUp'
import { createScriptedProvider } from './providers/mockHarness'
import { parseLevelUpAgentResponse } from '../shared/progression/types'
import type { LevelSpanContext } from '../shared/progression/types'

const combatSpan: LevelSpanContext = {
  characterId: 'c1',
  campaignId: 'camp1',
  archetype: 'fighter',
  newLevel: 2,
  spanStartXp: 0,
  activityTags: { combat: 5, arcane: 0, social: 0, exploration: 1 },
  emergentDirection: null,
  recentEventSummaries: ['You struck the bandit down.'],
  journalSnippets: [],
  logBookSnippets: []
}

const arcaneSpan: LevelSpanContext = {
  ...combatSpan,
  activityTags: { combat: 0, arcane: 4, social: 1, exploration: 0 },
  journalSnippets: ['Hours in the library studying spell theory.'],
  recentEventSummaries: ['You read an arcane primer.']
}

describe('parseLevelUpAgentResponse schema', () => {
  it('rejects !== 3 perks', () => {
    expect(
      parseLevelUpAgentResponse({
        narrationText: 'n',
        perks: [{ id: 'a', name: 'A', description: 'a', category: 'ac_bonus', flavorTags: [] }]
      })
    ).toBeNull()
  })
})

describe('resolveLevelUpPerks', () => {
  it('combat-span fixture yields martial category option', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({
        narrationText: 'Battle forged you.',
        perks: [
          { id: 'a', name: 'A', description: 'a', category: 'ac_bonus', flavorTags: ['martial'] },
          { id: 'b', name: 'B', description: 'b', category: 'extra_attack', flavorTags: ['combat'] },
          { id: 'c', name: 'C', description: 'c', category: 'hp_max_bonus', flavorTags: [] }
        ]
      })
    ])
    const result = await resolveLevelUpPerks(provider, combatSpan)
    expect(hasMartialOption(result)).toBe(true)
  })

  it('arcane-span fixture yields spell_access option', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({
        narrationText: 'Study bears fruit.',
        perks: [
          { id: 'a', name: 'A', description: 'a', category: 'spell_access', flavorTags: ['arcane'], catalogSpellKey: 'firebolt' },
          { id: 'b', name: 'B', description: 'b', category: 'check_proficiency', flavorTags: ['arcane'], proficiencyAbility: 'mind' },
          { id: 'c', name: 'C', description: 'c', category: 'custom_feature', flavorTags: ['arcane'] }
        ]
      })
    ])
    const result = await resolveLevelUpPerks(provider, arcaneSpan)
    expect(hasArcaneOption(result)).toBe(true)
  })

  it('fallback for fighter library study includes spell_access', async () => {
    const provider = createScriptedProvider(['not json', 'still bad', '{}'])
    const result = await resolveLevelUpPerks(provider, arcaneSpan)
    expect(hasArcaneOption(result)).toBe(true)
  })
})
