import { useState } from 'react'
import type { CompanionRosterEntry } from '../../../shared/partyMembers/types'
import {
  buildCompanionAvatarContent,
  companionRoleLabel,
  type CompanionAvatarContent
} from './playCompanionRosterLogic'

export interface PlayCompanionRosterProps {
  entries: readonly CompanionRosterEntry[]
  selectedId: string | null
  orderDraft: string
  savingOrder: boolean
  onSelect: (companionId: string) => void
  onOrderDraftChange: (text: string) => void
  onSaveOrder: () => void
}

function renderCompanionAvatarContent(
  content: CompanionAvatarContent,
  onImageError: () => void
): JSX.Element {
  if (content.kind === 'image') {
    return (
      <img
        className="play-companion-roster-avatar"
        src={content.src}
        alt=""
        onError={onImageError}
      />
    )
  }
  return (
    <span className="play-companion-roster-avatar play-companion-roster-avatar-fallback" aria-hidden="true">
      {content.text}
    </span>
  )
}

function CompanionRosterAvatar(props: { entry: CompanionRosterEntry }): JSX.Element {
  const [imageFailed, setImageFailed] = useState(false)
  return renderCompanionAvatarContent(
    buildCompanionAvatarContent({
      name: props.entry.name,
      portraitPath: props.entry.portraitPath,
      imageFailed
    }),
    () => setImageFailed(true)
  )
}

function CompanionOrderControl(props: PlayCompanionRosterProps): JSX.Element | null {
  if (!props.selectedId) {
    return null
  }
  return (
    <div className="play-companion-order">
      <label className="play-companion-order-label" htmlFor="companion-order-input">
        Order
      </label>
      <input
        id="companion-order-input"
        className="play-companion-order-input"
        type="text"
        value={props.orderDraft}
        placeholder="Hold the doorway…"
        onChange={(event) => props.onOrderDraftChange(event.target.value)}
      />
      <button
        type="button"
        className="play-companion-order-save"
        disabled={props.savingOrder}
        onClick={props.onSaveOrder}
      >
        {props.savingOrder ? 'Saving…' : 'Set order'}
      </button>
    </div>
  )
}

export function PlayCompanionRoster(props: PlayCompanionRosterProps): JSX.Element {
  if (props.entries.length === 0) {
    return (
      <section className="play-companion-roster play-companion-roster-empty" aria-label="Party companions">
        <span className="play-companion-roster-empty-label">No companions</span>
      </section>
    )
  }

  return (
    <section className="play-companion-roster" aria-label="Party companions">
      <ul className="play-companion-roster-list">
        {props.entries.map((entry) => {
          const selected = entry.id === props.selectedId
          return (
            <li key={entry.id}>
              <button
                type="button"
                className={
                  selected
                    ? 'play-companion-roster-item play-companion-roster-item-selected'
                    : 'play-companion-roster-item'
                }
                aria-pressed={selected}
                onClick={() => props.onSelect(entry.id)}
              >
                <CompanionRosterAvatar entry={entry} />
                <span className="play-companion-roster-name">{entry.name}</span>
                <span className="play-companion-roster-role">{companionRoleLabel(entry)}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <CompanionOrderControl {...props} />
    </section>
  )
}
