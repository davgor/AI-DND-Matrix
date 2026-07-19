import type { PlayLogEntry } from '../../../main/narrationLog'
import { FormattedText } from '../shared/FormattedText'

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

export function socialMessageSide(entry: PlayLogEntry): SocialMessageSide {
  return entry.speaker === 'player' ? 'player' : 'other'
}

export function SocialMessage(props: { entry: PlayLogEntry }): JSX.Element {
  const { entry } = props
  const side = socialMessageSide(entry)
  const name = socialSpeakerName(entry)
  const showAvatar = side === 'other'

  return (
    <div className={`social-message social-message--${side}`}>
      {showAvatar ? (
        <span className="social-avatar" aria-hidden="true" title={name}>
          {socialAvatarInitial(name)}
        </span>
      ) : null}
      <div className="social-message-body">
        <span className="social-message-name">{name}</span>
        <div className="social-message-bubble">
          {FormattedText({ as: 'p', className: 'social-message-text', text: entry.text })}
        </div>
      </div>
    </div>
  )
}
