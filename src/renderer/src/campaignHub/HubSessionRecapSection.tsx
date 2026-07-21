import { FormattedText } from '../shared/FormattedText'
import { SESSION_RECAP_HUB_SECTION_TITLE } from '../../../shared/sessionRecap'
import type { HubSessionRecapState } from './useHubSessionRecap'

export function HubSessionRecapSection(props: { recap: HubSessionRecapState }): JSX.Element {
  return (
    <section className="campaign-hub-section campaign-hub-session-recap">
      <h2>{SESSION_RECAP_HUB_SECTION_TITLE}</h2>
      {props.recap.status === 'loading' ? (
        <p className="campaign-hub-session-recap-loading" aria-busy="true">
          Loading session recap…
        </p>
      ) : (
        <FormattedText as="p" text={props.recap.text} />
      )}
    </section>
  )
}
