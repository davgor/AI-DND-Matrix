import type { Archetype } from '../../../engine/hp'
import { AbilityScoreAssignment } from './AbilityScoreAssignment'
import { DeathModeSelector } from './DeathModeSelector'
import { PartyMemberList } from './PartyMemberList'
import { useCharacterSetup } from './useCharacterSetup'
import './characterSetup.css'

const ARCHETYPES: Archetype[] = ['fighter', 'rogue', 'mage', 'cleric', 'ranger']

export interface CharacterSetupProps {
  campaignId: string
  onComplete: () => void
}

export function CharacterSetup(props: CharacterSetupProps): JSX.Element {
  const setup = useCharacterSetup(props.campaignId, props.onComplete)

  return (
    <div className="character-setup">
      <h1>Create Your Character</h1>

      <label>
        Name
        <input value={setup.name} onChange={(event) => setup.setName(event.target.value)} />
      </label>

      <label>
        Archetype
        <select
          value={setup.archetype}
          onChange={(event) => setup.setArchetype(event.target.value as Archetype)}
        >
          <option value="">--</option>
          {ARCHETYPES.map((archetype) => (
            <option key={archetype} value={archetype}>
              {archetype}
            </option>
          ))}
        </select>
      </label>

      <AbilityScoreAssignment onAssigned={setup.setAbilityScores} />

      <div className="portrait-upload">
        <button type="button" onClick={() => void setup.selectPortrait()}>
          Select Portrait
        </button>
        <button type="button" onClick={() => void setup.selectSheetBackground()}>
          Select Sheet Background
        </button>
      </div>

      <h2>Death Mode</h2>
      <DeathModeSelector onChange={setup.setDeathMode} />

      <h2>AI Party Members</h2>
      <PartyMemberList onChange={setup.setPartyMembers} />

      {setup.validationError && (
        <p className="character-setup-error">{setup.validationError}</p>
      )}

      <button type="button" disabled={setup.submitting} onClick={() => void setup.handleSubmit()}>
        {setup.submitting ? 'Creating...' : 'Begin Adventure'}
      </button>
    </div>
  )
}
