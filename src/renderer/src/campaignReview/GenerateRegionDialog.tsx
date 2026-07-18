import { randomAdditionalRegionNpcCount, randomRegionSeedPrompt } from '../../../shared/campaignCreate/randomFill'
import { FieldWithRandomInputRow } from '../components/FieldRandomDiceButton'
import { GenerateModalShell } from './GenerateModalShell'

function RegionSeedField(props: {
  seedPrompt: string
  generating: boolean
  onSeedChange: (value: string) => void
}): JSX.Element {
  return (
    <FieldWithRandomInputRow
      ariaLabel="Random region seed"
      disabled={props.generating}
      onRandomize={() => props.onSeedChange(randomRegionSeedPrompt())}
    >
      <textarea
        className="campaign-review-seed-input"
        value={props.seedPrompt}
        onChange={(event) => props.onSeedChange(event.target.value)}
        placeholder="e.g. A foggy fishing village where the tide brings strange warnings..."
        rows={5}
        disabled={props.generating}
      />
    </FieldWithRandomInputRow>
  )
}

function RegionNpcCountField(props: {
  npcCount: number
  npcCountBounds: { min: number; max: number }
  generating: boolean
  onNpcCountChange: (value: number) => void
}): JSX.Element {
  return (
    <label className="campaign-review-field">
      NPCs to generate
      <FieldWithRandomInputRow
        ariaLabel="Random NPC count"
        disabled={props.generating}
        centerAlign
        onRandomize={() => props.onNpcCountChange(randomAdditionalRegionNpcCount())}
      >
        <input
          type="number"
          min={props.npcCountBounds.min}
          max={props.npcCountBounds.max}
          value={props.npcCount}
          disabled={props.generating}
          onChange={(event) => props.onNpcCountChange(Number(event.target.value))}
        />
      </FieldWithRandomInputRow>
    </label>
  )
}

export function GenerateRegionDialog(props: {
  seedPrompt: string
  npcCount: number
  npcCountBounds: { min: number; max: number }
  generating: boolean
  generateError: string | null
  onSeedChange: (value: string) => void
  onNpcCountChange: (value: number) => void
  onClose: () => void
  onSubmit: () => void
}): JSX.Element {
  return (
    <GenerateModalShell
      titleId="generate-region-title"
      title="Generate another region"
      description="Seed the next region with a place, mood, conflict, or hook you want in the world."
      generating={props.generating}
      generateError={props.generateError}
      submitDisabled={!props.seedPrompt.trim()}
      submitLabel="Generate region"
      generatingLabel="Generating..."
      onClose={props.onClose}
      onSubmit={props.onSubmit}
    >
      <RegionSeedField
        seedPrompt={props.seedPrompt}
        generating={props.generating}
        onSeedChange={props.onSeedChange}
      />
      <RegionNpcCountField
        npcCount={props.npcCount}
        npcCountBounds={props.npcCountBounds}
        generating={props.generating}
        onNpcCountChange={props.onNpcCountChange}
      />
    </GenerateModalShell>
  )
}
