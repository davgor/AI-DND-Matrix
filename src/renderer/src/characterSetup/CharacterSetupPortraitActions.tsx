import type { CharacterSetupPortraitState } from './useCharacterSetupPortrait'

export function CharacterSetupPortraitActions(props: {
  portrait: CharacterSetupPortraitState
}): JSX.Element {
  const { portrait } = props
  return (
    <div className="character-setup-portrait-actions">
      <button
        type="button"
        disabled={portrait.generating || portrait.portraitPrompt.trim().length === 0}
        onClick={() => void portrait.generatePortrait()}
      >
        {portrait.generating ? 'Generating…' : 'Generate'}
      </button>
      <button type="button" disabled={portrait.generating} onClick={() => void portrait.uploadPortrait()}>
        Upload
      </button>
    </div>
  )
}
