import type { Archetype } from '../../../engine/hp'
import { AbilityScoreAssignment } from './AbilityScoreAssignment'
import { CharacterSetupCoreFields } from './CharacterSetupFields'
import type { CharacterSetupDraft } from './characterSetupDraft'
import { useCharacterSetup } from './useCharacterSetup'
import { ProceedButton } from '../onboarding/ProceedButton'
import './characterSetup.css'

const ARCHETYPES: Archetype[] = ['fighter', 'rogue', 'mage', 'cleric', 'ranger']

interface CharacterSetupProps {
  campaignId: string
  draft?: CharacterSetupDraft | null
  onComplete: () => void
}

export function CharacterSetup(props: CharacterSetupProps): JSX.Element {
  const setup = useCharacterSetup(props.campaignId, props.onComplete, props.draft)
  const formKey = `${setup.resumeCharacterId ?? 'new'}-${setup.initialAbilityScoreMethod}`

  return (
    <div className="character-setup">
      <h1>Create Your Character</h1>

      <CharacterSetupCoreFields setup={setup} archetypes={ARCHETYPES} />

      <AbilityScoreAssignment
        key={formKey}
        initialScores={setup.initialAbilityScores}
        initialMethod={setup.initialAbilityScoreMethod}
        onAssigned={setup.setAbilityScores}
        onMethodChange={setup.setAbilityScoreMethod}
      />

      {setup.validationError && (
        <p className="character-setup-error">{setup.validationError}</p>
      )}

      <ProceedButton disabled={setup.submitting} onClick={() => void setup.handleSubmit()}>
        {setup.submitting ? 'Creating...' : 'Choose your race'}
      </ProceedButton>
    </div>
  )
}
