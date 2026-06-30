import type { HubCastMember } from '../../../shared/campaignHub/types'
import { FormattedText } from '../shared/FormattedText'

export interface CampaignHubObituaryModalProps {
  member: HubCastMember | undefined
  onClose: () => void
}

export function CampaignHubObituaryModal(props: CampaignHubObituaryModalProps): JSX.Element | null {
  if (!props.member) {
    return null
  }

  const obituary = props.member.obituary

  return (
    <div className="campaign-hub-obituary-backdrop" role="presentation" onClick={props.onClose}>
      <div
        className="campaign-hub-obituary-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-hub-obituary-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="campaign-hub-obituary-header">
          <h2 id="campaign-hub-obituary-title">{props.member.name}</h2>
          <button type="button" className="campaign-hub-obituary-close" onClick={props.onClose}>
            Close
          </button>
        </header>

        {obituary ? (
          <div className="campaign-hub-obituary-body">
            <p className="campaign-hub-obituary-cause">
              <strong>Cause of death:</strong> {obituary.deathCause}
            </p>
            <div className="campaign-hub-obituary-narrative">
              {FormattedText({ as: 'p', text: obituary.narrativeBody })}
            </div>
            {obituary.npcReactions.length > 0 ? (
              <section className="campaign-hub-obituary-reactions">
                <h3>Reactions</h3>
                <ul>
                  {obituary.npcReactions.map((reaction) => (
                    <li key={reaction.npcId}>
                      <strong>{reaction.npcName}</strong> ({reaction.tone}) — {reaction.reaction}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : (
          <p className="campaign-hub-obituary-empty">
            No obituary was recorded for this character.
          </p>
        )}
      </div>
    </div>
  )
}
