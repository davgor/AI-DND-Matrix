import { randomNpcSeedPrompt } from '../../../shared/campaignCreate/randomFill'
import { FieldWithRandomInputRow } from '../components/FieldRandomDiceButton'
import { GenerateModalShell } from './GenerateModalShell'

export function GenerateNpcDialog(props: {
  regionName: string
  seedPrompt: string
  generating: boolean
  generateError: string | null
  onSeedChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}): JSX.Element {
  return (
    <GenerateModalShell
      titleId="generate-npc-title"
      title={`Generate NPC for ${props.regionName}`}
      description="Seed a new NPC tied to this region — role, mood, hook, or conflict."
      generating={props.generating}
      generateError={props.generateError}
      submitDisabled={!props.seedPrompt.trim()}
      submitLabel="Generate NPC"
      generatingLabel="Generating..."
      onClose={props.onClose}
      onSubmit={props.onSubmit}
    >
      <FieldWithRandomInputRow
        ariaLabel="Random NPC seed"
        disabled={props.generating}
        onRandomize={() => props.onSeedChange(randomNpcSeedPrompt(props.regionName))}
      >
        <textarea
          className="campaign-review-seed-input"
          value={props.seedPrompt}
          onChange={(event) => props.onSeedChange(event.target.value)}
          placeholder="e.g. A retired dock guard who saw something in the fog last night..."
          rows={5}
          disabled={props.generating}
        />
      </FieldWithRandomInputRow>
    </GenerateModalShell>
  )
}
