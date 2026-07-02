import type { HubCharacterQuestSummary } from '../../../shared/campaignHub/types'

export function HubQuestTeaser(props: {
  summary: HubCharacterQuestSummary | undefined
}): JSX.Element | null {
  if (!props.summary?.mainQuestHookLine) {
    return null
  }
  return (
    <section className="campaign-hub-section campaign-hub-quest-teaser">
      <h2>Main story</h2>
      <p className="campaign-hub-quest-hook">{props.summary.mainQuestHookLine}</p>
      {props.summary.mainQuestTitle ? (
        <p className="campaign-hub-quest-title">{props.summary.mainQuestTitle}</p>
      ) : null}
      <p className="campaign-hub-quest-side-count">
        {props.summary.activeSideQuestCount} active side quest
        {props.summary.activeSideQuestCount === 1 ? '' : 's'}
      </p>
    </section>
  )
}
