import { describe, expect, it } from 'vitest'
import {
  extractHyphenatedCompounds,
  findProseJargonViolations,
  meetsProseJargonStandards
} from './proseJargonGuard'

const VORATH_PURPLE_PROSE =
  'Vorath endures as a land of towering evergreens, fog-veiled vales, and shattered ziggurats where the wind carries howls from forgotten barrows. Sorcerer-kings once ruled from obsidian thrones, their spells binding elementals to forge eternal citadels. Now wilds reclaim those halls, and lanterns flicker in ward-posts manned by rune-scribed watchmen. Dwarven forge-clans hammer blades in mountain delves while elven wardens weave illusions over sacred groves. Merchant guilds ferry spices and grimoires along the Ironflow River, guarded by templar convoys sworn to the Silver Chalice. Peasants till fields ringed by thorn-hedges, offering first fruits to hearth-altars against nocturnal prowlers. Tensions simmer as beast-tribes raid border steads, their shamans summoning blights that wither crops overnight. Temple inquisitors clash with hedge-wizards over relic claims in overgrown cloisters. Refugee caravans swell frontier towns, whispering of upright shadows that mock prayers with lupine laughter.'

describe('proseJargonGuard', () => {
  it('extracts hyphenated compounds from prose', () => {
    expect(extractHyphenatedCompounds('fog-veiled vales and rune-scribed watchmen')).toEqual([
      'fog-veiled',
      'rune-scribed'
    ])
  })

  it('rejects prose that stacks hyphen compounds in one sentence', () => {
    const prose =
      'Storm-priests and bone-ink scribes argue over wreck rights while fog-veiled pilgrims wait on the quay.'
    const violations = findProseJargonViolations(prose)
    expect(violations.some((v) => v.startsWith('sentence'))).toBe(true)
    expect(meetsProseJargonStandards(prose)).toBe(false)
  })

  it('rejects paragraphs that sprinkle too many hyphen compounds across sentences', () => {
    const violations = findProseJargonViolations(VORATH_PURPLE_PROSE)
    expect(violations.some((v) => v.startsWith('paragraph'))).toBe(true)
    expect(meetsProseJargonStandards(VORATH_PURPLE_PROSE)).toBe(false)
  })

  it('allows occasional hyphen compounds when spread thinly', () => {
    const prose =
      'Harbor towns tax the same moorings twice while storm-priests argue over wreck rights. Farmers watch refugee columns pass on the coastal roads each autumn.\n\nSalvagers dredge barnacled crowns from the inner bays. Scholars argue whether the flood was natural or sabotage between rival archmages.\n\nBeacon fires fell dark when guild wars broke the tithe system. Captains who remembered the old routes became kings of smuggling lanes overnight.'
    expect(meetsProseJargonStandards(prose)).toBe(true)
  })

  it('allows a single hyphen compound in an otherwise plain sentence', () => {
    const prose = 'Fog-veiled vales hide old barrows where peasants still leave harvest offerings.'
    expect(meetsProseJargonStandards(prose)).toBe(true)
  })

  it('allows VALID_WORLD fixture prose used in generation tests', async () => {
    const { VALID_WORLD } = await import('./fixtures')
    expect(meetsProseJargonStandards(VALID_WORLD.worldSummary)).toBe(true)
    expect(meetsProseJargonStandards(VALID_WORLD.worldHistory)).toBe(true)
  })
})
