export function QuestAcceptButton(props: { onAccept?: () => void }): JSX.Element | null {
  return props.onAccept ? (
    <button type="button" className="btn" onClick={props.onAccept}>
      Track quest
    </button>
  ) : null
}

export function QuestAbandonButton(props: { onAbandon?: () => void }): JSX.Element | null {
  return props.onAbandon ? (
    <button type="button" className="btn" onClick={props.onAbandon}>
      Abandon
    </button>
  ) : null
}

export function QuestCurateButtons(props: {
  curateMode: boolean
  onEdit?: () => void
  onForceComplete?: () => void
}): JSX.Element | null {
  if (!props.curateMode) {
    return null
  }
  return (
    <>
      {props.onEdit ? (
        <button type="button" className="btn" onClick={props.onEdit}>
          Edit
        </button>
      ) : null}
      {props.onForceComplete ? (
        <button type="button" className="btn" onClick={props.onForceComplete}>
          Force complete
        </button>
      ) : null}
    </>
  )
}
