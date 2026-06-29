import {
  ALIGNMENTS,
  ALIGNMENT_LABELS,
  TEMPERAMENTS,
  type Alignment,
  type Temperament
} from '../../../shared/alignment/types'

export function NpcTraitFields(props: {
  temperament: Temperament
  alignment: Alignment | ''
  canSpeak: boolean
  onTemperamentChange: (value: Temperament) => void
  onAlignmentChange: (value: Alignment | '') => void
  onCanSpeakChange: (value: boolean) => void
}): JSX.Element {
  return (
    <>
      <label className="campaign-review-trait-field">
        <span>Temperament</span>
        <select
          value={props.temperament}
          onChange={(event) => props.onTemperamentChange(event.target.value as Temperament)}
        >
          {TEMPERAMENTS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <label className="campaign-review-trait-field">
        <span>Alignment</span>
        <select
          value={props.alignment}
          onChange={(event) => props.onAlignmentChange(event.target.value as Alignment | '')}
        >
          <option value="">None</option>
          {ALIGNMENTS.map((value) => (
            <option key={value} value={value}>
              {ALIGNMENT_LABELS[value]}
            </option>
          ))}
        </select>
      </label>

      <label className="campaign-review-trait-field campaign-review-trait-checkbox">
        <input
          type="checkbox"
          checked={props.canSpeak}
          onChange={(event) => props.onCanSpeakChange(event.target.checked)}
        />
        <span>Can speak (dialogue vs action description)</span>
      </label>
    </>
  )
}
