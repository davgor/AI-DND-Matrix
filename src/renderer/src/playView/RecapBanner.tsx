import { useEffect } from 'react'
import { FormattedText } from '../shared/FormattedText'
import { ModalPortal } from '../shared/ModalPortal'
import type { SessionRecapController } from './useSessionRecap'

export interface RecapBannerProps {
  recap: SessionRecapController
}

export function RecapBanner(props: RecapBannerProps): JSX.Element | null {
  const { recap } = props

  useEffect(() => {
    if (!recap.visible) {
      return
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        recap.skip()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [recap.visible, recap.skip])

  if (!recap.visible) {
    return null
  }

  return (
    <ModalPortal>
      <div className="recap-modal-overlay modal-overlay" role="presentation" onClick={recap.skip}>
        <div
          className="recap-modal modal-panel"
          role="dialog"
          aria-labelledby="recap-title"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="recap-modal-header">
            <div>
              <p className="eyebrow">Previously on...</p>
              <h2 id="recap-title">Session recap</h2>
            </div>
            <button type="button" className="character-log-book-close" aria-label="Close recap" onClick={recap.skip}>
              ×
            </button>
          </header>
          <div className="recap-modal-body">
            {recap.loading ? (
              <p className="recap-modal-loading">Loading recap…</p>
            ) : recap.text ? (
              FormattedText({ as: 'p', text: recap.text })
            ) : (
              <p className="recap-modal-empty">No recap available yet.</p>
            )}
          </div>
          <footer className="recap-modal-footer">
            <button type="button" className="btn recap-modal-close" onClick={recap.skip}>
              Close
            </button>
            <button
              type="button"
              className="btn recap-modal-generate"
              disabled={recap.loading}
              onClick={() => void recap.generate()}
            >
              {recap.loading ? 'Generating…' : 'Generate recap'}
            </button>
          </footer>
        </div>
      </div>
    </ModalPortal>
  )
}
