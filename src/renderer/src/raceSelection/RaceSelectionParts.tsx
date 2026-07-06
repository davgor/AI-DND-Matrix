import type { CampaignRace, RaceLore } from '../../../shared/raceSelection/types'
import type { RaceRosterGroup } from '../../../main/raceIpc'
import { isEstablishedPresetRace } from './raceSelectionLogic'
import { LoreFields } from './RaceSelectionLoreFields'

export function RacePickButton(props: {
  label: string
  selected: boolean
  established?: boolean
  onSelect: () => void
}): JSX.Element {
  return (
    <button
      type="button"
      className={`race-selection-option${props.selected ? ' is-selected' : ''}`}
      aria-pressed={props.selected}
      onClick={props.onSelect}
    >
      <span className="race-selection-option-label">{props.label}</span>
      {props.established ? (
        <span className="race-selection-established-badge">Established in this world</span>
      ) : null}
    </button>
  )
}

export function RosterGroup(props: {
  group: RaceRosterGroup
  campaignRaces: CampaignRace[]
  selectedRaceKey: string | null
  onSelect: (raceKey: string) => void
}): JSX.Element {
  return (
    <section className="race-selection-group">
      <h2>{props.group.label}</h2>
      <div className="race-selection-options">
        {props.group.entries.map((entry) => (
          <RacePickButton
            key={entry.key}
            label={entry.label}
            selected={props.selectedRaceKey === entry.key}
            established={isEstablishedPresetRace(props.campaignRaces, entry.key)}
            onSelect={() => props.onSelect(entry.key)}
          />
        ))}
      </div>
    </section>
  )
}

export function LoreField(props: {
  label: string
  value: string
  editable: boolean
  multiline?: boolean
  onChange: (value: string) => void
}): JSX.Element {
  return (
    <div className="race-selection-lore-field">
      <label>{props.label}</label>
      {props.multiline ? (
        <textarea
          value={props.value}
          disabled={!props.editable}
          onChange={(event) => props.onChange(event.target.value)}
        />
      ) : (
        <input
          type="text"
          value={props.value}
          disabled={!props.editable}
          onChange={(event) => props.onChange(event.target.value)}
        />
      )}
    </div>
  )
}

export function LorePanel(props: {
  title: string
  lore: RaceLore
  editable: boolean
  previewLoading: boolean
  showRegenerate: boolean
  onRegenerate: () => void
  onLoreChange: (field: keyof RaceLore, value: string | string[]) => void
}): JSX.Element {
  return (
    <section className="race-selection-lore">
      <div className="race-selection-lore-header">
        <h2>{props.title}</h2>
        {props.showRegenerate ? (
          <button
            type="button"
            className="race-selection-regenerate"
            disabled={props.previewLoading}
            onClick={() => void props.onRegenerate()}
          >
            Regenerate ↻
          </button>
        ) : null}
      </div>
      {props.previewLoading && !props.lore.summary ? (
        <p className="race-selection-preview-loading">Generating lore for this land...</p>
      ) : null}
      <LoreFields lore={props.lore} editable={props.editable} onLoreChange={props.onLoreChange} />
    </section>
  )
}
