import { FormattedText } from '../shared/FormattedText'
import type { SessionRecapController } from './useSessionRecap'

export function RecapModalBody(props: { loading: boolean; text: string | null }): JSX.Element {
  if (props.loading) {
    return <p className="recap-modal-loading">Loading recap…</p>
  }
  if (props.text) {
    return FormattedText({ as: 'p', text: props.text })
  }
  return <p className="recap-modal-empty">No recap available yet.</p>
}

export function RecapModalPanel(props: { recap: SessionRecapController }): JSX.Element {
  const { recap } = props
  return (
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
          <RecapModalBody loading={recap.loading} text={recap.text} />
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
  )
}
