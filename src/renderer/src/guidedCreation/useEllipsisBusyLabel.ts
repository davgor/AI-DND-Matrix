import { useEffect, useState } from 'react'

const FRAME_MS = 400

/** Animated busy label with cycling ellipsis while `active`. */
export function useEllipsisBusyLabel(
  active: boolean,
  labelForFrame: (frame: number) => string
): string | null {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (!active) {
      setFrame(0)
      return
    }
    const id = window.setInterval(() => {
      setFrame((current) => current + 1)
    }, FRAME_MS)
    return () => window.clearInterval(id)
  }, [active])

  return active ? labelForFrame(frame) : null
}
