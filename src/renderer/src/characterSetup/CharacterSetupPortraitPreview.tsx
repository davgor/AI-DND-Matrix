import { useEffect, useState } from 'react'

function portraitSrc(path: string | null): string | undefined {
  return path ? `file://${path}` : undefined
}

export function CharacterSetupPortraitPreview(props: {
  path: string | null
  characterName: string
}): JSX.Element {
  const [imageFailed, setImageFailed] = useState(false)
  useEffect(() => {
    setImageFailed(false)
  }, [props.path])
  const src = !imageFailed ? portraitSrc(props.path) : undefined
  const initial = (props.characterName.trim().charAt(0) || '?').toUpperCase()
  return (
    <div className="character-setup-portrait-preview">
      {src ? (
        <img src={src} alt="" onError={() => setImageFailed(true)} />
      ) : (
        <span className="character-setup-portrait-fallback" aria-hidden="true">
          {initial}
        </span>
      )}
    </div>
  )
}
