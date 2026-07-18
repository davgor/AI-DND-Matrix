export function GenerateModalOverlay(props: {
  generating: boolean
  onClose: () => void
  children: JSX.Element
}): JSX.Element {
  return (
    <div
      className="campaign-review-overlay"
      role="presentation"
      onClick={() => {
        if (!props.generating) {
          props.onClose()
        }
      }}
    >
      {props.children}
    </div>
  )
}
