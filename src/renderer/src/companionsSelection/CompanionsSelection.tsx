import { useState } from 'react'
import type { CompanionPreviewDto } from '../../../shared/partyMembers/types'
import { CompanionsSelectionForm, canGenerateCompanionPrompt } from './CompanionsSelectionForm'

export interface CompanionsSelectionProps {
  campaignId: string
  characterId: string
  onSkip: () => void
  onAccepted: () => void
  onBack: () => void
  onGenerate?: (prompt: string) => Promise<CompanionPreviewDto>
  onAcceptPreview?: (preview: CompanionPreviewDto) => Promise<void>
}

export function CompanionsSelection(props: CompanionsSelectionProps): JSX.Element {
  const [prompt, setPrompt] = useState('')
  const [preview, setPreview] = useState<CompanionPreviewDto | null>(null)
  const [generating, setGenerating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function runGenerate(): Promise<void> {
    if (!canGenerateCompanionPrompt(prompt) || !props.onGenerate) {
      return
    }
    setGenerating(true)
    setErrorMessage(null)
    try {
      setPreview(await props.onGenerate(prompt))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  async function runAccept(): Promise<void> {
    if (!preview) {
      return
    }
    if (props.onAcceptPreview) {
      await props.onAcceptPreview(preview)
    }
    props.onAccepted()
  }

  return (
    <CompanionsSelectionForm
      prompt={prompt}
      onPromptChange={setPrompt}
      preview={preview}
      generating={generating}
      onGenerate={() => void runGenerate()}
      onAccept={() => void runAccept()}
      onRegenerate={() => void runGenerate()}
      onSkip={props.onSkip}
      onBack={props.onBack}
      errorMessage={errorMessage}
    />
  )
}
