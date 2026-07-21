import { clampD20Face } from './d20OverlayLogic'

type D20FaceProps = {
  face: number
  /** Decorative tumble — hide from AT until settled. */
  tumbling?: boolean
  size?: number
  className?: string
  /** When false, omit the numeric label (Show rolls off, brief-then-clear). */
  showLabel?: boolean
}

export function D20Face(props: D20FaceProps): JSX.Element {
  const face = clampD20Face(props.face)
  const size = props.size ?? 72
  const tumbling = props.tumbling === true
  const showLabel = props.showLabel !== false
  const classes = ['d20-face', props.className].filter(Boolean).join(' ')

  return (
    <div
      className={classes}
      style={{ width: size, height: size }}
      {...(tumbling
        ? { 'aria-hidden': true as const }
        : { role: 'img' as const, 'aria-label': `d20 showing ${face}` })}
    >
      <svg className="d20-face-svg" viewBox="0 0 100 100" aria-hidden="true">
        <polygon
          className="d20-face-poly"
          points="50,4 90,28 90,72 50,96 10,72 10,28"
        />
        <polygon
          className="d20-face-facet"
          points="50,4 90,28 50,40"
        />
        <polygon
          className="d20-face-facet d20-face-facet-dim"
          points="50,4 10,28 50,40"
        />
        <polygon
          className="d20-face-facet"
          points="10,28 10,72 50,60 50,40"
        />
        <polygon
          className="d20-face-facet d20-face-facet-dim"
          points="90,28 90,72 50,60 50,40"
        />
        <polygon
          className="d20-face-facet"
          points="10,72 50,96 50,60"
        />
        <polygon
          className="d20-face-facet d20-face-facet-dim"
          points="90,72 50,96 50,60"
        />
      </svg>
      {showLabel ? <span className="d20-face-value">{face}</span> : null}
    </div>
  )
}
