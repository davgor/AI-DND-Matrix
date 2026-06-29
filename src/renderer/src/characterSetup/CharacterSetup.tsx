import type { Archetype } from '../../../engine/hp'
import { AbilityScoreAssignment } from './AbilityScoreAssignment'
import { PartyMemberList } from './PartyMemberList'
import { CharacterSetupCoreFields } from './CharacterSetupFields'
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

      <CharacterSetupCoreFields setup={setup} archetypes={ARCHETYPES} />

      <AbilityScoreAssignment onAssigned={setup.setAbilityScores} />

      <div className="portrait-upload">
        <button type="button" onClick={() => void setup.selectPortrait()}>
          Select Portrait
        </button>
        <button type="button" onClick={() => void setup.selectSheetBackground()}>
          Select Sheet Background
        </button>
      </div>

      <h2>AI Party Members</h2>
      <PartyMemberList onChange={setup.setPartyMembers} />

      {setup.validationError && (
        <p className="character-setup-error">{setup.validationError}</p>
      )}

      <button type="button" disabled={setup.submitting} onClick={() => void setup.handleSubmit()}>
        {setup.submitting ? 'Creating...' : 'Tell me about yourself'}
      </button>
    </div>
  )
}
