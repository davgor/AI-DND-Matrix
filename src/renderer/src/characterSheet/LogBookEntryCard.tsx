import type { LogEntry } from '../../../shared/logBook/types'
import { FormattedText } from '../shared/FormattedText'
import { LogBookCurateActions } from './LogBookCurateActions'
import { LOG_CATEGORY_LABELS } from './logBookGrouping'

function LogBookEditForm(props: {
  editTitle: string
  editContent: string
  onEditTitle: (value: string) => void
  onEditContent: (value: string) => void
  onSave: () => void
  onCancel: () => void
}): JSX.Element {
  return (
    <div className="character-log-book-edit-form">
      <input value={props.editTitle} onChange={(event) => props.onEditTitle(event.target.value)} aria-label="Title" />
      <textarea
        value={props.editContent}
        onChange={(event) => props.onEditContent(event.target.value)}
        aria-label="Content"
      />
      <button type="button" onClick={props.onSave}>
        Save
      </button>
      <button type="button" onClick={props.onCancel}>
        Cancel
      </button>
    </div>
  )
}

export function LogBookEntryCard(props: {
  entry: LogEntry
  relatedLabel: string | null
  curateMode: boolean
  editing: boolean
  editTitle: string
  editContent: string
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  onEditTitle: (value: string) => void
  onEditContent: (value: string) => void
}): JSX.Element {
  return (
    <li className="character-log-book-entry-card">
      <div className="character-log-book-entry-header">
        <strong>{props.entry.title}</strong>
        <span className="character-log-book-date">
          {LOG_CATEGORY_LABELS[props.entry.category]} · Day {props.entry.learnedInGameDate}
        </span>
      </div>
      {props.editing ? (
        <LogBookEditForm
          editTitle={props.editTitle}
          editContent={props.editContent}
          onEditTitle={props.onEditTitle}
          onEditContent={props.onEditContent}
          onSave={props.onSaveEdit}
          onCancel={props.onCancelEdit}
        />
      ) : (
        FormattedText({ as: 'p', text: props.entry.content })
      )}
      {props.relatedLabel ? (
        <p className="character-log-book-related" title={props.entry.relatedEntityId ?? undefined}>
          Related: {props.relatedLabel}
        </p>
      ) : null}
      {props.curateMode && !props.editing ? (
        <LogBookCurateActions onEdit={props.onStartEdit} onDelete={props.onDelete} />
      ) : null}
    </li>
  )
}
