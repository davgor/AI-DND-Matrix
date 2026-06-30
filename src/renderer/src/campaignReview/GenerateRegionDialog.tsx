import { GenerateModalActions } from './GenerateModalActions'

function GenerateNpcCountField(props: {
  value: number
  bounds: { min: number; max: number }
  generating: boolean
  onChange: (value: number) => void
}): JSX.Element {
  return (
    <label className="campaign-review-field">
      NPCs to generate
      <input
        type="number"
        min={props.bounds.min}
        max={props.bounds.max}
        value={props.value}
        disabled={props.generating}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
    </label>
  )
}

function GenerateRegionSeedField(props: {
  seedPrompt: string
  generating: boolean
  onSeedChange: (value: string) => void
}): JSX.Element {
  return (
    <textarea
      className="campaign-review-seed-input"
      value={props.seedPrompt}
      onChange={(event) => props.onSeedChange(event.target.value)}
      placeholder="e.g. A fog-choked fishing village where the tide brings whispered warnings..."
      rows={5}
      disabled={props.generating}
    />
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
    <div
      className="campaign-review-generate-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="generate-region-title"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !props.generating) {
          props.onClose()
        }
      }}
    >
      <h2 id="generate-region-title">Generate another region</h2>
      <p>Seed the next region with a place, mood, conflict, or hook you want in the world.</p>
      <GenerateRegionSeedField
        seedPrompt={props.seedPrompt}
        generating={props.generating}
        onSeedChange={props.onSeedChange}
      />
      <GenerateNpcCountField
        value={props.npcCount}
        bounds={props.npcCountBounds}
        generating={props.generating}
        onChange={props.onNpcCountChange}
      />
      {props.generateError ? <p className="campaign-review-error">{props.generateError}</p> : null}
      <GenerateModalActions
        generating={props.generating}
        submitDisabled={!props.seedPrompt.trim()}
        submitLabel="Generate region"
        generatingLabel="Generating..."
        onClose={props.onClose}
        onSubmit={props.onSubmit}
      />
    </div>
  )
}
