import { useEffect, useState } from 'react'

/** Match Social / PlaySessionChrome: Electron loads local assets via file:// URLs. */
function dossierFaceTokenSrc(faceTokenPath: string | null): string | undefined {
  return faceTokenPath ? `file://${faceTokenPath}` : undefined
}

export function NpcDossierPortrait(props: { faceTokenPath: string | null }): JSX.Element {
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    setLoadFailed(false)
  }, [props.faceTokenPath])

  const src = dossierFaceTokenSrc(props.faceTokenPath)
  const showImage = src !== undefined && !loadFailed

  return (
    <aside className="npc-dossier-portrait" aria-hidden="true">
      {showImage ? (
        <img src={src} alt="" onError={() => setLoadFailed(true)} />
      ) : (
        <span className="npc-dossier-portrait-placeholder" />
      )}
    </aside>
  )
}
