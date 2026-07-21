import './companionsSelection.css'

import { OnboardingBackButton } from '../onboarding/OnboardingBackButton'
import type { CompanionPreviewDto } from '../../../shared/partyMembers/types'

export interface CompanionsSelectionFormProps {
  prompt: string
  onPromptChange: (value: string) => void
  preview: CompanionPreviewDto | null
  generating: boolean
  onGenerate: () => void
  onAccept: () => void
  onRegenerate: () => void
  onSkip: () => void
  onBack: () => void
  errorMessage?: string | null
}

export function canGenerateCompanionPrompt(prompt: string): boolean {
  return prompt.trim().length > 0
}

export function CompanionsSelectionForm(props: CompanionsSelectionFormProps): JSX.Element {
  const canGenerate = canGenerateCompanionPrompt(props.prompt) && !props.generating
  return (
    <div className="companions-selection">
      <OnboardingBackButton onBack={props.onBack} />
      <h1>Traveling companion</h1>
      <p className="companions-selection-subtitle">
        Describe who travels with you. Skip if you prefer to adventure alone.
      </p>
      <label className="companions-selection-label" htmlFor="companion-prompt">
        Companion prompt
      </label>
      <textarea
        id="companion-prompt"
        className="companions-selection-prompt"
        rows={4}
        value={props.prompt}
        onChange={(event) => props.onPromptChange(event.target.value)}
        placeholder="A quiet elven scout who watches my back…"
      />
      {props.errorMessage ? (
        <p className="companions-selection-error" role="alert">
          {props.errorMessage}
        </p>
      ) : null}
      <CompanionsSelectionActions
        canGenerate={canGenerate}
        generating={props.generating}
        hasPreview={Boolean(props.preview)}
        onGenerate={props.onGenerate}
        onAccept={props.onAccept}
        onRegenerate={props.onRegenerate}
        onSkip={props.onSkip}
      />
      {props.preview ? <CompanionsPreviewCard preview={props.preview} /> : null}
    </div>
  )
}

function CompanionsSelectionActions(props: {
  canGenerate: boolean
  generating: boolean
  hasPreview: boolean
  onGenerate: () => void
  onAccept: () => void
  onRegenerate: () => void
  onSkip: () => void
}): JSX.Element {
  return (
    <div className="companions-selection-actions">
      <button type="button" disabled={!props.canGenerate} onClick={props.onGenerate}>
        {props.generating ? 'Generating…' : 'Generate'}
      </button>
      <button type="button" disabled={!props.hasPreview || props.generating} onClick={props.onAccept}>
        Accept
      </button>
      <button type="button" disabled={!props.canGenerate} onClick={props.onRegenerate}>
        Regenerate
      </button>
      <button type="button" disabled={props.generating} onClick={props.onSkip}>
        Skip
      </button>
    </div>
  )
}

function CompanionsPreviewCard(props: { preview: CompanionPreviewDto }): JSX.Element {
  const { preview } = props
  return (
    <section className="companions-selection-preview" aria-live="polite">
      <h2>{preview.name}</h2>
      <p>
        {preview.role} · {preview.raceKey} · {preview.characterClass}
      </p>
      <p>{preview.personality}</p>
    </section>
  )
}
