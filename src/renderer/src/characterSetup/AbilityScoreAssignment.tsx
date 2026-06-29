import { useState } from 'react'
import {
  abilityModifier,
  createSeededRandom,
  getPointBuyRemaining,
  POINT_BUY_MAX,
  POINT_BUY_MIN,
  POINT_BUY_POOL,
  resolvePointBuy,
  resolveStandardArray,
  rollForStats,
  STANDARD_ARRAY,
  type Ability,
  type AbilityScores
} from '../../../engine/abilities'

const ABILITIES: Ability[] = ['body', 'agility', 'mind', 'presence']
const ABILITY_LABELS: Record<Ability, string> = {
  body: 'Body',
  agility: 'Agility',
  mind: 'Mind',
  presence: 'Presence'
}
type Method = 'pointBuy' | 'standardArray' | 'roll'

const METHOD_OPTIONS: Array<{ value: Method; label: string }> = [
  { value: 'pointBuy', label: 'Point Buy' },
  { value: 'standardArray', label: 'Standard Array' },
  { value: 'roll', label: 'Roll for Stats' }
]

export interface AbilityScoreAssignmentProps {
  onAssigned: (scores: AbilityScores | null) => void
}

function usePointBuy(onAssigned: (scores: AbilityScores | null) => void) {
  const [scores, setScores] = useState<AbilityScores>({ body: 8, agility: 8, mind: 8, presence: 8 })

  function update(ability: Ability, value: number): void {
    const next = { ...scores, [ability]: value }
    setScores(next)
    const result = resolvePointBuy(next)
    onAssigned(result.valid ? next : null)
  }

  return { scores, update }
}

function useStandardArray(onAssigned: (scores: AbilityScores | null) => void) {
  const [assignment, setAssignment] = useState<Record<Ability, number | ''>>({
    body: '',
    agility: '',
    mind: '',
    presence: ''
  })

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

export function AbilityScoreAssignment(props: AbilityScoreAssignmentProps): JSX.Element {
  const [method, setMethod] = useState<Method>('pointBuy')
  const pointBuy = usePointBuy(props.onAssigned)
  const standardArray = useStandardArray(props.onAssigned)
  const [rolled, setRolled] = useState<AbilityScores | null>(null)

  function changeMethod(next: Method): void {
    setMethod(next)
    props.onAssigned(null)
  }

  function rollStats(): void {
    const scores = rollForStats(createSeededRandom(Date.now()))
    setRolled(scores)
    props.onAssigned(scores)
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
      {method === 'roll' && (
        <RollFields rolled={rolled} onRoll={rollStats} />
      )}
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
            {STANDARD_ARRAY.map((value) => (
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
