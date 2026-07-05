import { CUSTOM_RACE_KEY } from '../../../engine/raceSelection/roster'
import { randomCustomRaceSeed } from '../../../shared/raceSelection/randomFill'
import { FieldWithRandomInputRow } from '../components/FieldRandomDiceButton'
import {
  canGenerateLore,
  needsGenerateBeforeLore,
  updateCustomLabel,
  updateCustomSeed,
  type RaceSelectionState
} from './raceSelectionLogic'

export function CustomRacePanel(props: {
  state: RaceSelectionState
  previewLoading: boolean
  onStateChange: (next: RaceSelectionState) => void
  onGenerate: () => void
}): JSX.Element | null {
  if (props.state.kind !== 'custom') {
    return null
  }
  return (
    <div className="race-selection-custom-panel">
      <label htmlFor="custom-race-label">Race name</label>
      <input
        id="custom-race-label"
        type="text"
        value={props.state.customLabel}
        onChange={(event) => props.onStateChange(updateCustomLabel(props.state, event.target.value))}
      />
      <label htmlFor="custom-race-seed">What is this race?</label>
      <FieldWithRandomInputRow
        ariaLabel="Random custom race seed"
        onRandomize={() =>
          props.onStateChange(updateCustomSeed(props.state, randomCustomRaceSeed()))
        }
      >
        <textarea
          id="custom-race-seed"
          value={props.state.customSeedPrompt}
          onChange={(event) =>
            props.onStateChange(updateCustomSeed(props.state, event.target.value))
          }
        />
      </FieldWithRandomInputRow>
      {needsGenerateBeforeLore(props.state) ? (
        <button
          type="button"
          className="race-selection-generate"
          disabled={props.previewLoading || !canGenerateLore(props.state)}
          onClick={() => void props.onGenerate()}
        >
          {props.previewLoading ? 'Generating...' : 'Generate'}
        </button>
      ) : null}
    </div>
  )
}

export { CUSTOM_RACE_KEY }
