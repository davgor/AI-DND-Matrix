import type { CampaignRace } from '../../../shared/raceSelection/types'
import type { RaceRosterGroup } from '../../../main/raceIpc'
import type { PartyMemberDraft } from './PartyMemberSetup'

export interface PartyMemberRowProps {
  member: PartyMemberDraft
  index: number
  raceOptions: Array<{ key: string; label: string }>
  onUpdate: (index: number, patch: Partial<PartyMemberDraft>) => void
  onRemove: (index: number) => void
}

export function PartyMemberRow(props: PartyMemberRowProps): JSX.Element {
  const { member, index, raceOptions, onUpdate, onRemove } = props
  return (
    <div className="party-member-row">
      <label>
        Name
        <input value={member.name} onChange={(event) => onUpdate(index, { name: event.target.value })} />
      </label>
      <label>
        Class / Role
        <input
          value={member.characterClass}
          onChange={(event) => onUpdate(index, { characterClass: event.target.value })}
        />
      </label>
      <label>
        Personality
        <input
          value={member.personality}
          onChange={(event) => onUpdate(index, { personality: event.target.value })}
        />
      </label>
      <label>
        Race
        <select
          aria-label="Race"
          value={member.raceKey}
          onChange={(event) => onUpdate(index, { raceKey: event.target.value })}
        >
          {raceOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={() => onRemove(index)}>
        Remove
      </button>
    </div>
  )
}

export function buildRaceOptions(
  roster: RaceRosterGroup[],
  campaignRaces: CampaignRace[]
): Array<{ key: string; label: string }> {
  const preset = roster.flatMap((group) =>
    group.entries.map((entry) => ({ key: entry.key, label: entry.label }))
  )
  const custom = campaignRaces
    .filter((race) => race.kind === 'custom')
    .map((race) => ({ key: race.raceKey, label: race.label }))
  return [...preset, ...custom]
}
