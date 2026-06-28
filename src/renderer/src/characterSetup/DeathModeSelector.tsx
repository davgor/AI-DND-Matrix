import { useState } from 'react'
import type { DeathMode, RespawnRules } from '../../../db/repositories/campaigns'

export interface DeathModeSelectorProps {
  onChange: (deathMode: DeathMode, respawnRules: RespawnRules | null) => void
}

const DEATH_MODES: DeathMode[] = ['legendary', 'standard', 'respawn']

function buildRespawnRules(location: string, cost: number, limit: number | ''): RespawnRules | null {
  if (!location.trim()) {
    return null
  }
  return { location, cost, limit: limit === '' ? null : limit }
}

export function DeathModeSelector(props: DeathModeSelectorProps): JSX.Element {
  const [deathMode, setDeathMode] = useState<DeathMode>('legendary')
  const [location, setLocation] = useState('')
  const [cost, setCost] = useState(0)
  const [limit, setLimit] = useState<number | ''>('')

  function selectMode(mode: DeathMode): void {
    setDeathMode(mode)
    props.onChange(mode, mode === 'respawn' ? buildRespawnRules(location, cost, limit) : null)
  }

  function updateRespawnField(nextLocation: string, nextCost: number, nextLimit: number | ''): void {
    setLocation(nextLocation)
    setCost(nextCost)
    setLimit(nextLimit)
    props.onChange(deathMode, buildRespawnRules(nextLocation, nextCost, nextLimit))
  }

  return (
    <div className="death-mode-selector">
      {DEATH_MODES.map((mode) => (
        <label key={mode}>
          <input
            type="radio"
            name="death-mode"
            checked={deathMode === mode}
            onChange={() => selectMode(mode)}
          />
          {mode}
        </label>
      ))}
      {deathMode === 'respawn' && (
        <RespawnRulesFields
          location={location}
          cost={cost}
          limit={limit}
          onChange={updateRespawnField}
        />
      )}
    </div>
  )
}

interface RespawnRulesFieldsProps {
  location: string
  cost: number
  limit: number | ''
  onChange: (location: string, cost: number, limit: number | '') => void
}

function RespawnRulesFields(props: RespawnRulesFieldsProps): JSX.Element {
  return (
    <div className="respawn-rules-fields">
      <input
        placeholder="Respawn location"
        value={props.location}
        onChange={(event) => props.onChange(event.target.value, props.cost, props.limit)}
      />
      <input
        type="number"
        placeholder="Cost"
        value={props.cost}
        onChange={(event) => props.onChange(props.location, Number(event.target.value), props.limit)}
      />
      <input
        type="number"
        placeholder="Limit (optional)"
        value={props.limit}
        onChange={(event) =>
          props.onChange(
            props.location,
            props.cost,
            event.target.value === '' ? '' : Number(event.target.value)
          )
        }
      />
    </div>
  )
}
