import { useState } from 'react'
import {
  createSeededRandom,
  resolvePointBuy,
  resolveStandardArray,
  rollForStats,
  STANDARD_ARRAY,
  type Ability,
  type AbilityScores
} from '../../../engine/abilities'

const ABILITIES: Ability[] = ['body', 'agility', 'mind', 'presence']
type Method = 'pointBuy' | 'standardArray' | 'roll'

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
    <div className="ability-score-assignment">
      <select value={method} onChange={(event) => changeMethod(event.target.value as Method)}>
        <option value="pointBuy">Point Buy</option>
        <option value="standardArray">Standard Array</option>
        <option value="roll">Roll for Stats</option>
      </select>

      {method === 'pointBuy' && (
        <PointBuyFields scores={pointBuy.scores} onChange={pointBuy.update} />
      )}
      {method === 'standardArray' && (
        <StandardArrayFields assignment={standardArray.assignment} onChange={standardArray.update} />
      )}
      {method === 'roll' && (
        <div>
          <button type="button" onClick={rollStats}>
            {rolled ? 'Re-roll' : 'Roll'}
          </button>
          {rolled && (
            <span>
              {ABILITIES.map((a) => `${a}: ${rolled[a]}`).join(', ')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

interface PointBuyFieldsProps {
  scores: AbilityScores
  onChange: (ability: Ability, value: number) => void
}

function PointBuyFields(props: PointBuyFieldsProps): JSX.Element {
  return (
    <div>
      {ABILITIES.map((ability) => (
        <label key={ability}>
          {ability}
          <input
            type="number"
            value={props.scores[ability]}
            onChange={(event) => props.onChange(ability, Number(event.target.value))}
          />
        </label>
      ))}
    </div>
  )
}

interface StandardArrayFieldsProps {
  assignment: Record<Ability, number | ''>
  onChange: (ability: Ability, value: number) => void
}

function StandardArrayFields(props: StandardArrayFieldsProps): JSX.Element {
  return (
    <div>
      {ABILITIES.map((ability) => (
        <label key={ability}>
          {ability}
          <select
            value={props.assignment[ability]}
            onChange={(event) => props.onChange(ability, Number(event.target.value))}
          >
            <option value="">--</option>
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
