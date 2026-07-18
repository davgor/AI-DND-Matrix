import { useEffect, useRef } from 'react'
import type { GuidedCreationPhase } from '../../../shared/guidedCreation/types'
import { shouldAutoEnterWorld } from './openingSceneAutoEnter'

/** Fires `onEnterPlay` once when opening-scene phase becomes complete. */
export function OpeningSceneAutoEnterEffect(props: {
  phase: GuidedCreationPhase
  onEnterPlay: () => void
}): null {
  const enteredRef = useRef(false)

  useEffect(() => {
    if (!shouldAutoEnterWorld(props.phase) || enteredRef.current) {
      return
    }
    enteredRef.current = true
    props.onEnterPlay()
  }, [props.phase, props.onEnterPlay])

  return null
}
