import { useState } from 'react'
import type { PlayLogEntry } from '../../../main/narrationLog'
import { FormattedText } from '../shared/FormattedText'
import { incomingHighlightClassName } from './incomingHighlight'

type SocialMessageSide = 'player' | 'other'

export function socialSpeakerName(entry: PlayLogEntry): string {
  if (entry.speaker === 'player') {
    return 'You'
  }
  if (entry.speaker === 'npc') {
    return entry.speakerName ?? 'NPC'
  }
  if (entry.speaker === 'partyMember') {
    return entry.speakerName ?? 'Ally'
  }
  return 'Unknown'
}

export function socialAvatarInitial(name: string): string {
  const trimmed = name.trim()
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?'
}

export function socialFaceTokenSrc(faceTokenPath: string | null | undefined): string | undefined {
  return faceTokenPath ? `file://${faceTokenPath}` : undefined
}

type SocialAvatarContent =
  | { kind: 'initial'; text: string }
  | { kind: 'image'; src: string }

export function buildSocialAvatarContent(input: {
  name: string
  faceTokenPath?: string | null
  imageFailed?: boolean
}): SocialAvatarContent {
  const initial = socialAvatarInitial(input.name)
  const src = socialFaceTokenSrc(input.faceTokenPath)
  if (src && input.imageFailed !== true) {
    return { kind: 'image', src }
  }
  return { kind: 'initial', text: initial }
}

export function socialMessageSide(entry: PlayLogEntry): SocialMessageSide {
  return entry.speaker === 'player' ? 'player' : 'other'
}

function socialOpensDossier(entry: PlayLogEntry): entry is PlayLogEntry & { npcId: string } {
  return entry.speaker === 'npc' && typeof entry.npcId === 'string'
}

function renderSocialAvatarContent(content: SocialAvatarContent, onImageError: () => void): JSX.Element | string {
  if (content.kind === 'image') {
    return (
      <img
        className="social-avatar-image"
        src={content.src}
        alt=""
        onError={onImageError}
      />
    )
  }
  return content.text
}

function SocialAvatar(props: {
  name: string
  faceTokenPath?: string | null
  npcId?: string
  onOpenNpcDossier?: (npcId: string) => void
}): JSX.Element {
  const [imageFailed, setImageFailed] = useState(false)
  const avatarContent = renderSocialAvatarContent(
    buildSocialAvatarContent({
      name: props.name,
      faceTokenPath: props.faceTokenPath,
      imageFailed
    }),
    () => setImageFailed(true)
  )
  const { npcId, onOpenNpcDossier } = props
  if (npcId && onOpenNpcDossier) {
    return (
      <button
        type="button"
        className="social-avatar social-avatar-button"
        aria-label={`Open dossier for ${props.name}`}
        onClick={() => onOpenNpcDossier(npcId)}
      >
        {avatarContent}
      </button>
    )
  }
  return (
    <span className="social-avatar" aria-hidden="true" title={props.name}>
      {avatarContent}
    </span>
  )
}

function SocialName(props: {
  name: string
  npcId?: string
  onOpenNpcDossier?: (npcId: string) => void
}): JSX.Element {
  const { npcId, onOpenNpcDossier } = props
  if (npcId && onOpenNpcDossier) {
    return (
      <button
        type="button"
        className="social-message-name social-message-name-button"
        onClick={() => onOpenNpcDossier(npcId)}
      >
        {props.name}
      </button>
    )
  }
  return <span className="social-message-name">{props.name}</span>
}

export function SocialMessage(props: {
  entry: PlayLogEntry
  highlighted?: boolean
  onOpenNpcDossier?: (npcId: string) => void
}): JSX.Element {
  const { entry } = props
  const side = socialMessageSide(entry)
  const name = socialSpeakerName(entry)
  const showAvatar = side === 'other'
  const dossierNpcId = socialOpensDossier(entry) ? entry.npcId : undefined
  const bubbleClass = incomingHighlightClassName(
    props.highlighted === true,
    'social-message-bubble'
  )

  return (
    <div className={`social-message social-message--${side}`} data-entry-id={entry.id}>
      {showAvatar ? (
        <SocialAvatar
          name={name}
          faceTokenPath={entry.faceTokenPath}
          npcId={dossierNpcId}
          onOpenNpcDossier={props.onOpenNpcDossier}
        />
      ) : null}
      <div className="social-message-body">
        <SocialName name={name} npcId={dossierNpcId} onOpenNpcDossier={props.onOpenNpcDossier} />
        <div className={bubbleClass}>
          {FormattedText({ as: 'p', className: 'social-message-text', text: entry.text })}
        </div>
      </div>
    </div>
  )
}
