import type { CampaignStartFlow } from './useCampaignStartFlow'
import { randomRespawnLocation } from '../../../shared/campaignCreate/randomFill'
import { FieldWithRandomInputRow } from '../components/FieldRandomDiceButton'

export function CampaignStartRespawnLocationField(props: {
  flow: CampaignStartFlow
  disabled: boolean
}): JSX.Element {
  return (
    <label className="campaign-start-field">
      Respawn location
      <FieldWithRandomInputRow
        ariaLabel="Random respawn location"
        disabled={props.disabled}
        centerAlign
        onRandomize={() => props.flow.updateForm({ respawnLocation: randomRespawnLocation() })}
      >
        <input
          type="text"
          value={props.flow.form.respawnLocation}
          disabled={props.disabled}
          onChange={(event) => props.flow.updateForm({ respawnLocation: event.target.value })}
        />
      </FieldWithRandomInputRow>
    </label>
  )
}

export function CampaignStartCountField(props: {
  label: string
  hint: string
  ariaLabel: string
  value: number
  min: number
  max: number
  disabled: boolean
  onRandomize: () => void
  onChange: (value: number) => void
}): JSX.Element {
  return (
    <label className="campaign-start-field">
      {props.label}
      <FieldWithRandomInputRow
        ariaLabel={props.ariaLabel}
        disabled={props.disabled}
        centerAlign
        onRandomize={props.onRandomize}
      >
        <input
          type="number"
          min={props.min}
          max={props.max}
          value={props.value}
          disabled={props.disabled}
          onChange={(event) => props.onChange(Number(event.target.value))}
        />
      </FieldWithRandomInputRow>
      <span className="campaign-start-hint">{props.hint}</span>
    </label>
  )
}
