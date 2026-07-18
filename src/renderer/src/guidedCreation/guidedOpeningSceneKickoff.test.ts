import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Character } from '../../../db/repositories/characters'
import { GuidedOpeningSceneStage } from './GuidedCreationStages'
import { kickoffGuidedIdentity, shouldStartIdentityKickoff } from './guidedIdentityKickoff'

function openingScenePlayer(overrides: Partial<Character> = {}): Character {
  return {
    id: 'char-1',
    campaignId: 'campaign-1',
    name: 'Kael',
    characterClass: 'fighter',
    stats: {},
    inventory: [],
    hp: 10,
    xp: 0,
    level: 1,
    currency: 0,
    kind: 'player',
    sourceNpcId: null,
    portraitPath: null,
    sheetBackgroundPath: null,
    identityWho: 'Kael',
    identityWhy: 'Justice',
    identityWhere: 'Oakhollow',
    identityWhat: 'Fighter',
    openingScene: null,
    guidedCreationPhase: 'opening_scene',
    alignment: null,
    pendingAlignmentShift: null,
    lifeStatus: 'alive',
    diedAt: null,
    deathCause: null,
    obituary: null,
    ownerPlayerCharacterId: null,
    raceKey: null,
    backgroundKey: null,
    backgroundStory: null,
    ...overrides
  }
}

describe('GuidedOpeningSceneStage layout', () => {
  it('wraps the shell in guided-opening-scene-stage for full-width flex fill', () => {
    const tree = GuidedOpeningSceneStage({
      campaignId: 'campaign-1',
      character: openingScenePlayer(),
      onEnterPlay: () => {},
      onRefresh: async () => {}
    })
    expect(tree.props.className).toBe('guided-opening-scene-stage')
  })

  it('styles the stage to stretch beside the sidebar', () => {
    const css = readFileSync(join(__dirname, 'guidedConversation.css'), 'utf8')
    expect(css).toMatch(/\.guided-opening-scene-stage\s*\{[^}]*flex:\s*1/s)
    expect(css).toMatch(/\.guided-opening-scene-stage\s*\{[^}]*min-width:\s*0/s)
  })
})

describe('shouldStartIdentityKickoff opening scene', () => {
  it('starts kickoff for opening_scene when the phase transcript is empty', () => {
    expect(
      shouldStartIdentityKickoff({
        phase: 'opening_scene',
        loading: false,
        kickingOff: false,
        sending: false,
        identityMessageCount: 0,
        kickoffStarted: false
      })
    ).toBe(true)
  })

  it('does not start when opening-scene messages already exist', () => {
    expect(
      shouldStartIdentityKickoff({
        phase: 'opening_scene',
        loading: false,
        kickingOff: false,
        sending: false,
        identityMessageCount: 1,
        kickoffStarted: false
      })
    ).toBe(false)
  })
})

describe('kickoffGuidedIdentity opening scene dispatch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls kickoffOpeningScene when phase is opening_scene', async () => {
    const kickoffOpeningScene = vi.fn().mockResolvedValue({ ok: true, kickedOff: true })
    vi.stubGlobal('window', {
      guidedCreation: {
        kickoffIdentity: vi.fn(),
        kickoffOpeningScene
      }
    })
    const refresh = vi.fn().mockResolvedValue(undefined)
    await kickoffGuidedIdentity({
      campaignId: 'c1',
      characterId: 'p1',
      phase: 'opening_scene',
      refresh
    })
    expect(kickoffOpeningScene).toHaveBeenCalledWith({ campaignId: 'c1', characterId: 'p1' })
    expect(refresh).toHaveBeenCalled()
  })
})
