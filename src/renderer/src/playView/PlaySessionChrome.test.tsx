import { describe, expect, it, vi } from 'vitest'
import { PlaySessionChrome, requestHubExit } from './PlaySessionChrome'
import { combatBadgeSummary, isCombatActive } from './usePlaySessionChromeData'
import type { CombatStateSnapshot } from '../../../shared/combat/types'

const COMBAT_STATE: CombatStateSnapshot = {
  encounterId: 'e1',
  round: 2,
  activeCombatant: { kind: 'player', id: 'p1' },
  pursuitState: 'engaged',
  playerExited: false,
  initiativeOrder: [{ ref: { kind: 'player', id: 'p1' }, name: 'Kael', roll: 14, isActive: true }],
  combatants: []
}

describe('PlaySessionChrome', () => {
  it('renders character, region, day, and combat badge when combat is active', () => {
    const node = PlaySessionChrome({
      characterName: 'Kael',
      portraitPath: null,
      regionName: 'Oakhollow',
      inGameDay: 5,
      campaignName: 'Test Campaign',
      campaignsCollapsed: false,
      combatState: COMBAT_STATE,
      showRolls: false,
      onOpenRecap: () => {},
      onToggleShowRolls: () => {},
      onExitToCampaignHub: () => {}
    })

    expect(node.props.className).toBe('play-session-chrome')
    const identityChildren = (node.props.children as JSX.Element[])[0].props.children as JSX.Element[]
    const characterLabel = identityChildren.find(
      (child) => child.props?.className === 'play-session-chrome-character'
    )
    expect(characterLabel?.props.children).toBe('Kael')
    const metaChildren = (node.props.children as JSX.Element[])[1].props.children as JSX.Element[]
    const dayLabel = metaChildren.find((child) => child?.props?.className === 'play-session-chrome-day')
    expect(dayLabel?.props.children).toEqual(['Day ', 5])
    const combatBadge = metaChildren.find(
      (child) => child?.props?.className === 'play-session-chrome-combat-badge'
    )
    expect(String(combatBadge?.props.children)).toContain('Combat')
    expect(isCombatActive(COMBAT_STATE)).toBe(true)
    expect(combatBadgeSummary(COMBAT_STATE)).toContain('Round 2')
  })

  it('calls hub navigation without confirm when combat is inactive', () => {
    const onExit = vi.fn()
    const confirmFn = vi.fn(() => true)
    requestHubExit(false, onExit, confirmFn)
    expect(confirmFn).not.toHaveBeenCalled()
    expect(onExit).toHaveBeenCalledOnce()
  })

  it('confirms hub navigation when combat is active', () => {
    const onExit = vi.fn()
    const confirmFn = vi.fn(() => true)
    requestHubExit(true, onExit, confirmFn)
    expect(confirmFn).toHaveBeenCalledOnce()
    expect(onExit).toHaveBeenCalledOnce()
  })
})
