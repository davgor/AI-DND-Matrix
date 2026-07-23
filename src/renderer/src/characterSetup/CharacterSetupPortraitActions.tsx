import type { CharacterSetupPortraitState } from './useCharacterSetupPortrait'

export function CharacterSetupPortraitActions(props: {
  portrait: CharacterSetupPortraitState
  imageReady?: boolean
}): JSX.Element {
  const { portrait } = props
  const imageReady = props.imageReady !== false
  const generateDisabled =
    portrait.generating || portrait.portraitPrompt.trim().length === 0 || !imageReady
  return (
    <div className="character-setup-portrait-actions">
      <button
        type="button"
        disabled={generateDisabled}
        onClick={() => void portrait.generatePortrait()}
        title={imageReady ? undefined : 'Enable a ready image provider in Settings first.'}
      >
        {portrait.generating ? 'Generating…' : 'Generate'}
      </button>
      <button type="button" disabled={portrait.generating} onClick={() => void portrait.uploadPortrait()}>
        Upload
      </button>
      {!imageReady ? (
        <p className="character-setup-portrait-hint">
          Image generation needs a ready image provider in Settings.
        </p>
      ) : null}
    </div>
  )
}
