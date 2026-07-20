import { useEffect, useState } from 'react'
import {
  abilityModifier,
  availableStandardArrayOptions,
  createSeededRandom,
  getPointBuyRemaining,
  POINT_BUY_MAX,
  POINT_BUY_MIN,
  POINT_BUY_POOL,
  resolvePointBuy,
  resolveStandardArray,
  rollForStats,
  type Ability,
  type AbilityScores
} from '../../../engine/abilities'
import type { AbilityScoreMethod } from '../../../shared/characterSetup/abilityScoreMethod'
import { inferAbilityScoreMethod } from '../../../shared/characterSetup/abilityScoreMethod'

const ABILITIES: Ability[] = ['body', 'agility', 'mind', 'presence']
const ABILITY_LABELS: Record<Ability, string> = {
  body: 'Body',
  agility: 'Agility',
  mind: 'Mind',
  presence: 'Presence'
}

const METHOD_OPTIONS: Array<{ value: AbilityScoreMethod; label: string }> = [
  { value: 'pointBuy', label: 'Point Buy' },
  { value: 'standardArray', label: 'Standard Array' },
  { value: 'roll', label: 'Roll for Stats' }
]

export interface AbilityScoreAssignmentProps {
  onAssigned: (scores: AbilityScores | null) => void
  initialScores?: AbilityScores | null
  initialMethod?: AbilityScoreMethod
  onMethodChange?: (method: AbilityScoreMethod) => void
}

function resolveInitialMethod(
  initialMethod: AbilityScoreMethod | undefined,
  initialScores: AbilityScores | null | undefined
): AbilityScoreMethod {
  if (initialMethod) {
    return initialMethod
  }
  if (initialScores) {
    return inferAbilityScoreMethod(initialScores)
  }
  return 'pointBuy'
}

function emptyStandardAssignment(): Record<Ability, number | ''> {
  return { body: '', agility: '', mind: '', presence: '' }
}

function standardAssignmentFromScores(scores: AbilityScores): Record<Ability, number | ''> {
  return {
    body: scores.body,
    agility: scores.agility,
    mind: scores.mind,
    presence: scores.presence
  }
}

function usePointBuy(
  onAssigned: (scores: AbilityScores | null) => void,
  active: boolean,
  initialScores?: AbilityScores | null
) {
  const [scores, setScores] = useState<AbilityScores>(
    initialScores ?? { body: 8, agility: 8, mind: 8, presence: 8 }
  )

  useEffect(() => {
    if (!initialScores) {
      return
    }
    setScores(initialScores)
  }, [initialScores])

  useEffect(() => {
    if (!active || !initialScores) {
      return
    }
    onAssigned(initialScores)
  }, [active, initialScores, onAssigned])

  function update(ability: Ability, value: number): void {
    const next = { ...scores, [ability]: value }
    setScores(next)
    const result = resolvePointBuy(next)
    onAssigned(result.valid ? next : null)
  }

  return { scores, update }
}

function useStandardArray(
  onAssigned: (scores: AbilityScores | null) => void,
  active: boolean,
  initialScores?: AbilityScores | null
) {
  const [assignment, setAssignment] = useState<Record<Ability, number | ''>>(() =>
    initialScores && resolveStandardArray(initialScores).valid
      ? standardAssignmentFromScores(initialScores)
      : emptyStandardAssignment()
  )

  useEffect(() => {
    if (!initialScores || !resolveStandardArray(initialScores).valid) {
      return
    }
    setAssignment(standardAssignmentFromScores(initialScores))
  }, [initialScores])

  useEffect(() => {
    if (!active || !initialScores || !resolveStandardArray(initialScores).valid) {
      return
    }
    onAssigned(initialScores)
  }, [active, initialScores, onAssigned])

  function update(ability: Ability, value: number): void {
    const next = { ...assignment, [ability]: value }
    setAssignment(next)
    if (ABILITIES.every((a) => next[a] !== '')) {
      const result = resolveStandardArray(next as AbilityScores)
      onAssigned(result.valid ? (next as AbilityScores) : null)
    } else {
      onAssigned(null)
    }
  }

  return { assignment, update }
}

function useRollAssignment(
  onAssigned: (scores: AbilityScores | null) => void,
  active: boolean,
  initialScores?: AbilityScores | null
) {
  const [rolled, setRolled] = useState<AbilityScores | null>(initialScores ?? null)

  useEffect(() => {
    if (!active || !initialScores) {
      return
    }
    setRolled(initialScores)
    onAssigned(initialScores)
  }, [active, initialScores, onAssigned])

  function rollStats(): void {
    const scores = rollForStats(createSeededRandom(Date.now()))
    setRolled(scores)
    onAssigned(scores)
  }

  return { rolled, rollStats }
}

export function AbilityScoreAssignment(props: AbilityScoreAssignmentProps): JSX.Element {
  const [method, setMethod] = useState<AbilityScoreMethod>(() =>
    resolveInitialMethod(props.initialMethod, props.initialScores)
  )
  const pointBuy = usePointBuy(props.onAssigned, method === 'pointBuy', props.initialScores)
  const standardArray = useStandardArray(props.onAssigned, method === 'standardArray', props.initialScores)
  const roll = useRollAssignment(props.onAssigned, method === 'roll', props.initialScores)

  useEffect(() => {
    setMethod(resolveInitialMethod(props.initialMethod, props.initialScores))
  }, [props.initialMethod, props.initialScores])

  function changeMethod(next: AbilityScoreMethod): void {
    setMethod(next)
    props.onMethodChange?.(next)
    props.onAssigned(null)
  }

  return (
    <section className="ability-score-assignment">
      <h2>Ability Scores</h2>

      <fieldset className="ability-method-fieldset">
        <legend>Assignment method</legend>
        <div className="ability-method-options" role="radiogroup" aria-label="Ability score assignment method">
          {METHOD_OPTIONS.map((option) => (
            <label key={option.value} className="ability-method-option">
              <input
                type="radio"
                name="ability-score-method"
                value={option.value}
                checked={method === option.value}
                onChange={() => changeMethod(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {method === 'pointBuy' && (
        <PointBuyFields scores={pointBuy.scores} onChange={pointBuy.update} />
      )}
      {method === 'standardArray' && (
        <StandardArrayFields assignment={standardArray.assignment} onChange={standardArray.update} />
      )}
      {method === 'roll' && <RollFields rolled={roll.rolled} onRoll={roll.rollStats} />}
    </section>
  )
}

interface PointBuyFieldsProps {
  scores: AbilityScores
  onChange: (ability: Ability, value: number) => void
}

function PointBuyFields(props: PointBuyFieldsProps): JSX.Element {
  const remaining = getPointBuyRemaining(props.scores)
  const overBudget = remaining < 0

  return (
    <div className="ability-point-buy panel-card">
      <PointBuyRemainingCounter remaining={remaining} overBudget={overBudget} />
      <div className="ability-score-rows">
        {ABILITIES.map((ability) => (
          <PointBuyAbilityRow
            key={ability}
            ability={ability}
            score={props.scores[ability]}
            remaining={remaining}
            onChange={props.onChange}
          />
        ))}
      </div>
    </div>
  )
}

function PointBuyRemainingCounter(props: { remaining: number; overBudget: boolean }): JSX.Element {
  return (
    <div
      className={`ability-points-remaining${props.overBudget ? ' ability-points-remaining-over' : ''}`}
    >
      <span className="ability-points-remaining-value">{props.remaining}</span>
      <span className="ability-points-remaining-label">points remaining</span>
      <span className="ability-points-remaining-pool">of {POINT_BUY_POOL}</span>
    </div>
  )
}

function PointBuyAbilityRow(props: {
  ability: Ability
  score: number
  remaining: number
  onChange: (ability: Ability, value: number) => void
}): JSX.Element {
  const modifier = abilityModifier(props.score)
  const modifierLabel = modifier >= 0 ? `+${modifier}` : `${modifier}`
  const canIncrease = props.remaining > 0 && props.score < POINT_BUY_MAX

  function adjust(delta: number): void {
    const next = Math.min(POINT_BUY_MAX, Math.max(POINT_BUY_MIN, props.score + delta))
    props.onChange(props.ability, next)
  }

  return (
    <div className="ability-score-row">
      <span className="ability-score-label">{ABILITY_LABELS[props.ability]}</span>
      <div className="ability-score-stepper">
        <button
          type="button"
          className="ability-score-step"
          disabled={props.score <= POINT_BUY_MIN}
          onClick={() => adjust(-1)}
          aria-label={`Decrease ${ABILITY_LABELS[props.ability]}`}
        >
          −
        </button>
        <span className="ability-score-value">{props.score}</span>
        <button
          type="button"
          className="ability-score-step"
          disabled={!canIncrease}
          onClick={() => adjust(1)}
          aria-label={`Increase ${ABILITY_LABELS[props.ability]}`}
        >
          +
        </button>
      </div>
      <span className="ability-score-modifier">{modifierLabel}</span>
    </div>
  )
}

interface StandardArrayFieldsProps {
  assignment: Record<Ability, number | ''>
  onChange: (ability: Ability, value: number) => void
}

function StandardArrayFields(props: StandardArrayFieldsProps): JSX.Element {
  return (
    <div className="ability-standard-array panel-card">
      {ABILITIES.map((ability) => (
        <label key={ability} className="character-setup-field">
          <span>{ABILITY_LABELS[ability]}</span>
          <select
            value={props.assignment[ability]}
            onChange={(event) => props.onChange(ability, Number(event.target.value))}
          >
            <option value="">Choose a score</option>
            {availableStandardArrayOptions(props.assignment, ability).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  )
}

interface RollFieldsProps {
  rolled: AbilityScores | null
  onRoll: () => void
}

function RollFields(props: RollFieldsProps): JSX.Element {
  return (
    <div className="ability-roll panel-card">
      <button type="button" onClick={props.onRoll}>
        {props.rolled ? 'Re-roll' : 'Roll'}
      </button>
      {props.rolled ? (
        <dl className="ability-roll-results">
          {ABILITIES.map((ability) => (
            <div key={ability} className="ability-roll-result">
              <dt>{ABILITY_LABELS[ability]}</dt>
              <dd>{props.rolled![ability]}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="character-setup-hint">Roll 4d6 drop lowest for each ability.</p>
      )}
    </div>
  )
}
