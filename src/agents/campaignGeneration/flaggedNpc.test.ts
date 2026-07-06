import { describe, expect, it } from 'vitest'
import { GENDER_ROSTER } from '../../shared/npcGender/types'
import { NPC_CLASS_ROSTER } from '../../shared/npcClass/types'
import { buildAvailableRaceOptions } from '../raceLore'
import {
  buildFlaggedNpcFinalPrompt,
  buildNpcCoreBundlePrompt,
  generateNpcCoreBundle
} from './flaggedNpc'
import { createScriptedProvider } from '../providers/mockHarness'
import type { NpcCoreBundle } from './types'

const SAMPLE_LORE = {
  summary: 'Humans are widespread settlers.',
  appearance: 'Varied build and coloring.',
  culture: 'Ambitious and adaptable.',
  roleInThisLand: 'They run the harbor guilds.',
  hooks: ['A human captain seeks lost charts.']
}

const SPEAKING_BUNDLE: NpcCoreBundle = {
  canSpeak: true,
  temperament: 'cautious',
  raceKey: 'human',
  genderKey: 'man',
  alignment: 'lawful_neutral',
  classKey: 'soldier',
  backgroundKey: 'soldier'
}

describe('buildNpcCoreBundlePrompt (052.5)', () => {
  it('includes race, gender, class, and background rosters', () => {
    const prompt = buildNpcCoreBundlePrompt({
      regionName: 'Harbor',
      regionDescription: 'A salt port.',
      seedPrompt: 'A grizzled veteran',
      availableRaces: buildAvailableRaceOptions([]),
      availableGenders: GENDER_ROSTER,
      availableClasses: NPC_CLASS_ROSTER
    })
    expect(prompt).toContain('no name, role, disposition, or backstory')
    expect(prompt).toContain('soldier: Soldier')
    expect(prompt).toContain('man: Man')
    expect(prompt).toContain('folk_hero: Folk Hero')
  })
})

describe('generateNpcCoreBundle (052.5 + 051.4)', () => {
  it('validates all identity fields when canSpeak is true', async () => {
    const payload = JSON.stringify({
      canSpeak: true,
      temperament: 'cautious',
      race: 'human',
      gender: 'man',
      alignment: 'lawful_neutral',
      class: 'fighter',
      background: 'soldier'
    })
    const provider = createScriptedProvider([payload])
    const bundle = await generateNpcCoreBundle(provider, {
      regionName: 'Harbor',
      regionDescription: 'A salt port.',
      seedPrompt: 'A grizzled veteran',
      availableRaces: buildAvailableRaceOptions([])
    })
    expect(bundle.backgroundKey).toBe('soldier')
    expect(bundle.genderKey).toBe('man')
  })

  it('omits identity fields when canSpeak is false', async () => {
    const payload = JSON.stringify({
      canSpeak: false,
      temperament: 'aggressive',
      race: 'human',
      gender: 'man'
    })
    const provider = createScriptedProvider([payload])
    const bundle = await generateNpcCoreBundle(provider, {
      regionName: 'Wilds',
      regionDescription: 'Deep forest.',
      seedPrompt: 'A hostile dire wolf',
      availableRaces: buildAvailableRaceOptions([])
    })
    expect(bundle.canSpeak).toBe(false)
    expect(bundle.raceKey).toBeUndefined()
    expect(bundle.backgroundKey).toBeUndefined()
  })
})

describe('buildFlaggedNpcFinalPrompt (052.6 + 051.5)', () => {
  it('includes full race lore, region history, and background grounding when the NPC speaks', () => {
    const prompt = buildFlaggedNpcFinalPrompt({
      regionName: 'Harbor',
      regionDescription: 'A salt port.',
      regionHistory: ['The docks burned last winter.'],
      seedPrompt: 'A grizzled veteran running the tavern',
      existingNpcNames: ['Mira'],
      bundle: SPEAKING_BUNDLE,
      raceLabel: 'Human',
      raceLore: SAMPLE_LORE,
      genderBlurb: 'Uses he/him pronouns.',
      classBlurb: 'Trained melee combatant, disciplined with weapons and armor.',
      backgroundLabel: 'Soldier',
      backgroundDescription:
        'You served in an army or militia — drilled, marched, and fought. Discipline, rank, and old comrades (or old enemies) follow you still.'
    })
    expect(prompt).toContain('The docks burned last winter.')
    expect(prompt).toContain('Role in this land: They run the harbor guilds.')
    expect(prompt).toContain('Uses he/him pronouns.')
    expect(prompt).toContain('Background (Soldier):')
    expect(prompt).toContain('Let the backstory reflect this background')
  })

  it('omits identity grounding when canSpeak is false', () => {
    const prompt = buildFlaggedNpcFinalPrompt({
      regionName: 'Wilds',
      regionDescription: 'Deep forest.',
      regionHistory: [],
      seedPrompt: 'A hostile dire wolf',
      existingNpcNames: [],
      bundle: { canSpeak: false, temperament: 'aggressive' }
    })
    expect(prompt).not.toContain('Established identity facts')
    expect(prompt).toContain('omit backstory entirely')
  })
})
