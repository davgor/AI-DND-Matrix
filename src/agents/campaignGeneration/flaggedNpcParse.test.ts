import { describe, expect, it } from 'vitest'
import { buildAvailableRaceOptions } from '../raceLore'
import { parseNpcCoreBundleRecord } from './flaggedNpcParse'
import type { AvailableRaceOption } from '../../shared/raceSelection/types'
import type { NpcCoreBundle } from './types'

const availableRaces = buildAvailableRaceOptions([])

function expectHumanHerbalistWoman(bundle: NpcCoreBundle | undefined): void {
  expect(bundle).toMatchObject({
    canSpeak: true,
    raceKey: 'human',
    genderKey: 'woman',
    classKey: 'commoner',
    backgroundKey: 'hermit'
  })
}

function parseSpeakingBundle(
  record: Record<string, unknown>,
  races: AvailableRaceOption[] = availableRaces
): NpcCoreBundle | undefined {
  return parseNpcCoreBundleRecord(record, races)
}

describe('parseNpcCoreBundleRecord race and gender aliases (147)', () => {
  it('accepts race labels and mixed-case keys against available options', () => {
    const byLabel = parseSpeakingBundle({
      canSpeak: true,
      temperament: 'cautious',
      race: 'Human',
      gender: 'female',
      alignment: 'true_neutral',
      class: 'herbalist',
      background: 'hermit'
    })
    expectHumanHerbalistWoman(byLabel)

    const byMixedCase = parseSpeakingBundle({
      canSpeak: true,
      temperament: 'neutral',
      race: 'ELF',
      gender: 'male',
      alignment: 'chaotic_good',
      class: 'ranger',
      background: 'outlander'
    })
    expect(byMixedCase?.raceKey).toBe('elf')
    expect(byMixedCase?.genderKey).toBe('man')
  })
})

describe('parseNpcCoreBundleRecord herbalist payload (147)', () => {
  it('accepts a realistic herbalist-style core bundle that models often emit', () => {
    const bundle = parseSpeakingBundle({
      canSpeak: true,
      temperament: 'cautious',
      race: 'Human',
      gender: 'Female',
      alignment: 'Neutral Good',
      class: 'Herbalist',
      background: 'herbalist',
      hairColor: 'brown',
      age: 'middle-aged',
      eyeColor: 'green'
    })
    expect(bundle).toEqual({
      canSpeak: true,
      temperament: 'cautious',
      raceKey: 'human',
      genderKey: 'woman',
      alignment: 'neutral_good',
      classKey: 'commoner',
      backgroundKey: 'hermit',
      hairColor: 'brown',
      age: 'middle-aged',
      eyeColor: 'green'
    })
  })
})
