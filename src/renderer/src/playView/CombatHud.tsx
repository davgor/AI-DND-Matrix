import type { CombatStateSnapshot, NpcYieldOutcome } from '../../../shared/combat/types'
import type { FleeTurnOutcome } from '../../../shared/combat/flee/types'
import './combatHud.css'

const YIELD_BADGE_LABELS: Record<NpcYieldOutcome, string> = {
  surrender: 'Surrendered',
  flee: 'Fled',
  incapacitated: 'Incapacitated',
  slain: 'Slain'
}

function YieldBadge({ outcome }: { outcome: NpcYieldOutcome }): JSX.Element {
  const modifierClass =
    outcome === 'surrender'
      ? 'combat-hud-yield-badge--surrendered'
      : outcome === 'flee'
        ? 'combat-hud-yield-badge--fled'
        : 'combat-hud-yield-badge--incapacitated'
  return (
    <span className={`combat-hud-yield-badge ${modifierClass}`}>
      {YIELD_BADGE_LABELS[outcome]}
    </span>
  )
}

export interface CombatHudProps {
  combatState: CombatStateSnapshot | null | undefined
  fleeOutcome?: FleeTurnOutcome | null
  compact?: boolean
}

function CombatHudCompact(props: { combatState: CombatStateSnapshot }): JSX.Element {
  const showPursued = props.combatState.pursuitState === 'pursued'
  return (
    <aside className="combat-hud combat-hud--compact" aria-label="Combat status">
      <span className="combat-hud-title">Combat</span>
      <span className="combat-hud-round">R{props.combatState.round}</span>
      {showPursued ? <span className="combat-hud-fleeing">Fleeing</span> : null}
      {props.combatState.playerExited ? (
        <span className="combat-hud-player-exited">Allies fighting</span>
      ) : null}
    </aside>
  )
}

function CombatHudFull(props: { combatState: CombatStateSnapshot; showPursued: boolean }): JSX.Element {
  return (
    <aside className="combat-hud" aria-label="Combat status">
      <div className="combat-hud-header">
        <span className="combat-hud-title">Combat</span>
        <span className="combat-hud-round">Round {props.combatState.round}</span>
      </div>
      {props.showPursued ? (
        <p className="combat-hud-fleeing" role="status">
          Fleeing — still pursued
        </p>
      ) : null}
      {props.combatState.playerExited ? (
        <p className="combat-hud-player-exited" role="status">
          You escaped — allies may still be fighting
        </p>
      ) : null}
      <ol className="combat-hud-initiative">
        {props.combatState.initiativeOrder.map((entry) => (
          <li
            key={`${entry.ref.kind}:${entry.ref.id}`}
            className={entry.isActive ? 'combat-hud-initiative-active' : undefined}
          >
            <span>{entry.name}</span>
            <span className="combat-hud-initiative-roll">{entry.roll}</span>
          </li>
        ))}
      </ol>
      <ul className="combat-hud-combatants">
        {props.combatState.combatants.map((entry) => (
          <li key={`${entry.ref.kind}:${entry.ref.id}`}>
            <span>{entry.name}</span>
            <span className="combat-hud-hp">
              {entry.hp}/{entry.maxHp} HP
            </span>
            {entry.conditions.map((condition) => (
              <span key={condition} className="combat-hud-condition">
                {condition}
              </span>
            ))}
            {entry.encounterOutcome ? <YieldBadge outcome={entry.encounterOutcome} /> : null}
          </li>
        ))}
      </ul>
    </aside>
  )
}

export function fleeFeedPrefix(phase: FleeTurnOutcome['phase']): string {
  if (phase === 'failed') {
    return 'Flee failed — '
  }
  if (phase === 'pursued') {
    return 'Still pursued — '
  }
  return 'Escaped — '
}

export function CombatHud(props: CombatHudProps): JSX.Element | null {
  if (!props.combatState) {
    return null
  }
  const showPursued =
    props.combatState.pursuitState === 'pursued' || props.fleeOutcome?.phase === 'pursued'
  if (props.compact) {
    return <CombatHudCompact combatState={props.combatState} />
  }
  return <CombatHudFull combatState={props.combatState} showPursued={showPursued} />
}
