import type { Character } from '../../../db/repositories/characters'
import { useImageGenerationReadiness } from '../settings/useImageGenerationReadiness'
import { PlaySheetPortraitControls, PlaySheetPortraitPreview } from './PlaySheetPortraitParts'
import { usePlaySheetPortraitState } from './usePlaySheetPortraitState'

export function PlaySheetPortraitSlot(props: {
  character: Character
  campaignId: string
  onCharacterUpdated: (character: Character) => void
}): JSX.Element {
  const state = usePlaySheetPortraitState(props)
  const imageReady = useImageGenerationReadiness()
  return (
    <section className="play-sheet-portrait" aria-label="Character portrait">
      <div className="play-sheet-portrait-preview">
        <PlaySheetPortraitPreview
          path={props.character.portraitPath}
          name={props.character.name}
          loadFailed={state.loadFailed}
          onFailed={() => state.setLoadFailed(true)}
        />
      </div>
      <PlaySheetPortraitControls
        prompt={state.prompt}
        busy={state.busy}
        error={state.error}
        imageReady={imageReady.ready}
        onPromptChange={state.setPrompt}
        onRegenerate={() => void state.regenerate()}
        onReplace={() => void state.replace()}
      />
    </section>
  )
}
