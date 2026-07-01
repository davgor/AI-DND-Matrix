import { useState } from 'react'
import type { CombatStateSnapshot } from '../../../shared/combat/types'
import type { FleeTurnOutcome } from '../../../shared/combat/flee/types'
import {
  getCombatStripCollapsed,
  setCombatStripCollapsed
} from './combatStripPreferences'
import { CombatHud } from './CombatHud'

export interface CombatStripProps {
  combatState: CombatStateSnapshot | null | undefined
  fleeOutcome?: FleeTurnOutcome | null
  compact: boolean
}

export function combatStripToggleLabel(collapsed: boolean): string {
  return collapsed ? 'Show combat' : 'Hide combat'
}

export function CombatStrip(props: CombatStripProps): JSX.Element | null {
  const [collapsed, setCollapsed] = useState(() => getCombatStripCollapsed(window.localStorage))

  if (!props.combatState) {
    return null
  }

  function toggleCollapsed(): void {
    setCollapsed((current) => {
      const next = !current
      setCombatStripCollapsed(window.localStorage, next)
      return next
    })
  }

  return (
    <section className="combat-strip" aria-label="Combat">
      <button
        type="button"
        className="combat-strip-toggle"
        aria-expanded={!collapsed}
        onClick={toggleCollapsed}
      >
        {combatStripToggleLabel(collapsed)}
      </button>
      {!collapsed ? (
        <CombatHud combatState={props.combatState} fleeOutcome={props.fleeOutcome} compact={props.compact} />
      ) : null}
    </section>
  )
}
