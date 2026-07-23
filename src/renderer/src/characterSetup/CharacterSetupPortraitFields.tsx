import type { CharacterSetupPortraitState } from './useCharacterSetupPortrait'
import { CharacterSetupPortraitActions } from './CharacterSetupPortraitActions'
import { CharacterSetupPortraitPreview } from './CharacterSetupPortraitPreview'
import { useImageGenerationReadiness } from '../settings/useImageGenerationReadiness'

export function CharacterSetupPortraitFields(props: {
  portrait: CharacterSetupPortraitState
  characterName: string
}): JSX.Element {
  const { portrait, characterName } = props
  const imageReady = useImageGenerationReadiness()
  return (
    <section className="character-setup-portrait" aria-label="Character portrait">
      <CharacterSetupPortraitPreview path={portrait.portraitPath} characterName={characterName} />
      <label className="character-setup-field">
        <span>Appearance prompt</span>
        <textarea
          value={portrait.portraitPrompt}
          onChange={(event) => portrait.setPortraitPrompt(event.target.value)}
          rows={3}
          placeholder="Describe how your character looks…"
        />
      </label>
      <CharacterSetupPortraitActions portrait={portrait} imageReady={imageReady.ready} />
      {portrait.generateError ? (
        <p className="character-setup-error">{portrait.generateError}</p>
      ) : null}
    </section>
  )
}
