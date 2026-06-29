import { FormattedText } from '../shared/FormattedText'
import type { SessionRecapController } from './useSessionRecap'

export interface RecapBannerProps {
  recap: SessionRecapController
}

export function RecapBanner(props: RecapBannerProps): JSX.Element | null {
  const { recap } = props
  if (!recap.visible) {
    return null
  }

  if (recap.text) {
    return (
      <div className="play-view-recap">
        {FormattedText({ as: 'p', text: recap.text })}
        <button type="button" onClick={recap.skip}>
          Continue
        </button>
      </div>
    )
  }

  return (
    <div className="play-view-recap">
      <p>Previously on this campaign...</p>
      <button type="button" disabled={recap.loading} onClick={() => void recap.view()}>
        {recap.loading ? 'Loading...' : 'View Recap'}
      </button>
      <button type="button" onClick={recap.skip}>
        Skip
      </button>
    </div>
  )
}
