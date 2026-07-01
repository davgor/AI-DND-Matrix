export function LogBookCurateActions(props: { onEdit: () => void; onDelete: () => void }): JSX.Element {
  return (
    <div className="character-log-book-curate-actions">
      <button type="button" onClick={props.onEdit}>
        Edit
      </button>
      <button type="button" onClick={props.onDelete}>
        Delete
      </button>
    </div>
  )
}
