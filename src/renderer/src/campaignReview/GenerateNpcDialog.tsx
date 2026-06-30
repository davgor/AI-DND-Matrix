import { GenerateModalActions } from './GenerateModalActions'

function GenerateNpcSeedField(props: {
  seedPrompt: string
  generating: boolean
  onSeedChange: (value: string) => void
}): JSX.Element {
  return (
    <textarea
      className="campaign-review-seed-input"
      value={props.seedPrompt}
      onChange={(event) => props.onSeedChange(event.target.value)}
      placeholder="e.g. A retired dock guard who saw something in the fog last night..."
      rows={5}
      disabled={props.generating}
    />
  )
}

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
    <div
      className="campaign-review-generate-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="generate-npc-title"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !props.generating) {
          props.onClose()
        }
      }}
    >
      <h2 id="generate-npc-title">Generate NPC for {props.regionName}</h2>
      <p>Seed a new NPC tied to this region — role, mood, hook, or conflict.</p>
      <GenerateNpcSeedField
        seedPrompt={props.seedPrompt}
        generating={props.generating}
        onSeedChange={props.onSeedChange}
      />
      {props.generateError ? (
        <p className="campaign-review-error">{props.generateError}</p>
      ) : null}
      <GenerateModalActions
        generating={props.generating}
        submitDisabled={!props.seedPrompt.trim()}
        submitLabel="Generate NPC"
        generatingLabel="Generating..."
        onClose={props.onClose}
        onSubmit={props.onSubmit}
      />
    </div>
  )
}
