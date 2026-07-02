import { useEffect } from 'react'
import { ModalPortal } from '../shared/ModalPortal'
import { RecapModalPanel } from './RecapModalPanel'
import type { SessionRecapController } from './useSessionRecap'

export interface RecapBannerProps {
  recap: SessionRecapController
}

function useRecapEscapeKey(visible: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!visible) {
      return
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [visible, onClose])
}

export function RecapBanner(props: RecapBannerProps): JSX.Element | null {
  useRecapEscapeKey(props.recap.visible, props.recap.skip)
  if (!props.recap.visible) {
    return null
  }
  return (
    <ModalPortal>
      <RecapModalPanel recap={props.recap} />
    </ModalPortal>
  )
}
