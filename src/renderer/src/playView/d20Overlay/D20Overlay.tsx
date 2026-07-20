import {
  D20_OVERLAY_EXIT_MS,
  D20_OVERLAY_REDUCED_MOTION_MS,
  D20_OVERLAY_SETTLE_MS,
  D20_OVERLAY_TRAVEL_MS,
  type CheckSnapshot
} from './d20OverlayLogic'
import { D20Face } from './D20Face'
import { useD20Overlay } from './useD20Overlay'
import type { CSSProperties } from 'react'
import './d20Overlay.css'

function overlayTimingStyle(durationMs: number): CSSProperties {
  return {
    pointerEvents: 'none',
    '--d20-travel-ms': `${D20_OVERLAY_TRAVEL_MS}ms`,
    '--d20-settle-ms': `${D20_OVERLAY_SETTLE_MS}ms`,
    '--d20-exit-ms': `${D20_OVERLAY_EXIT_MS}ms`,
    '--d20-reduced-ms': `${D20_OVERLAY_REDUCED_MOTION_MS}ms`,
    '--d20-total-ms': `${durationMs}ms`
  } as CSSProperties
}

type D20OverlayProps = {
  lastCheck: CheckSnapshot
  showRolls: boolean
}

/**
 * Full-play-view D20 spectacle. Mount under `.in-campaign-overlays`.
 * Pointer-events none — never blocks input.
 */
export function D20Overlay(props: D20OverlayProps): JSX.Element | null {
  const playback = useD20Overlay(props.lastCheck, props.showRolls)
  if (!playback.active || playback.face === null) {
    return null
  }

  const motionClass = playback.reducedMotion
    ? 'd20-overlay-die d20-overlay-die--reduced'
    : 'd20-overlay-die d20-overlay-die--travel'
  const faceClass = playback.persistFaceLabel ? 'd20-face--settled' : 'd20-face--brief'

  return (
    <div
      className="d20-overlay"
      aria-live="polite"
      data-d20-play={playback.playKey}
      data-d20-reduced={playback.reducedMotion ? 'true' : 'false'}
      style={overlayTimingStyle(playback.durationMs)}
    >
      <div key={playback.playKey} className={motionClass}>
        <D20Face face={playback.face} showLabel className={faceClass} />
      </div>
    </div>
  )
}
