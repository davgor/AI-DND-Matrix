import { playSheetPortraitSrc } from './playSheetPortraitActions'

export function PlaySheetPortraitPreview(props: {
  path: string | null
  name: string
  loadFailed: boolean
  onFailed: () => void
}): JSX.Element {
  const src = !props.loadFailed ? playSheetPortraitSrc(props.path) : undefined
  if (src) {
    return <img src={src} alt="" onError={props.onFailed} />
  }
  return (
    <span className="play-sheet-portrait-fallback" aria-hidden="true">
      {props.name.charAt(0).toUpperCase()}
    </span>
  )
}

export function PlaySheetPortraitControls(props: {
  prompt: string
  busy: boolean
  error: string | null
  imageReady?: boolean
  onPromptChange: (value: string) => void
  onRegenerate: () => void
  onReplace: () => void
}): JSX.Element {
  const imageReady = props.imageReady !== false
  return (
    <>
      <label className="play-sheet-portrait-prompt">
        <span>Appearance prompt</span>
        <textarea
          value={props.prompt}
          onChange={(event) => props.onPromptChange(event.target.value)}
          rows={2}
          disabled={props.busy}
        />
      </label>
      <div className="play-sheet-portrait-actions">
        <button
          type="button"
          disabled={props.busy || props.prompt.trim().length === 0 || !imageReady}
          onClick={props.onRegenerate}
          title={imageReady ? undefined : 'Enable a ready image provider in Settings first.'}
        >
          Regenerate
        </button>
        <button type="button" disabled={props.busy} onClick={props.onReplace}>
          Replace
        </button>
      </div>
      {!imageReady ? (
        <p className="play-sheet-portrait-error">
          Image generation needs a ready image provider in Settings.
        </p>
      ) : null}
      {props.error ? <p className="play-sheet-portrait-error">{props.error}</p> : null}
    </>
  )
}
