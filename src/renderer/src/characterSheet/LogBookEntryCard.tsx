import type { LogEntry } from '../../../shared/logBook/types'
import { FormattedText } from '../shared/FormattedText'
import { LogBookCurateActions } from './LogBookCurateActions'
import { LogBookOpenDossierButton, logBookShowsDossierAffordance } from './LogBookDossierAffordance'
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

function LogBookEntryCardBody(props: {
  entry: LogEntry
  relatedLabel: string | null
  editing: boolean
  editTitle: string
  editContent: string
  onSaveEdit: () => void
  onCancelEdit: () => void
  onEditTitle: (value: string) => void
  onEditContent: (value: string) => void
  relatedEntityId: string | null
  onOpenNpcDossier?: (npcId: string) => void
}): JSX.Element {
  return (
    <>
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
      {props.relatedEntityId && props.onOpenNpcDossier ? (
        <LogBookOpenDossierButton
          relatedEntityId={props.relatedEntityId}
          onOpenNpcDossier={props.onOpenNpcDossier}
        />
      ) : null}
    </>
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
  onOpenNpcDossier?: (npcId: string) => void
}): JSX.Element {
  const relatedEntityId = logBookShowsDossierAffordance(
    props.entry.category,
    props.entry.relatedEntityId,
    props.onOpenNpcDossier
  )
    ? props.entry.relatedEntityId
    : null

  return (
    <li className="character-log-book-entry-card">
      <LogBookEntryCardBody
        entry={props.entry}
        relatedLabel={props.relatedLabel}
        editing={props.editing}
        editTitle={props.editTitle}
        editContent={props.editContent}
        onSaveEdit={props.onSaveEdit}
        onCancelEdit={props.onCancelEdit}
        onEditTitle={props.onEditTitle}
        onEditContent={props.onEditContent}
        relatedEntityId={relatedEntityId}
        onOpenNpcDossier={props.onOpenNpcDossier}
      />
      {props.curateMode && !props.editing ? (
        <LogBookCurateActions onEdit={props.onStartEdit} onDelete={props.onDelete} />
      ) : null}
    </li>
  )
}
