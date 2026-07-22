import type { HubCastMember } from '../../../shared/campaignHub/types'
import { formatLastActiveLabel } from '../../../shared/sharedTime'

interface CampaignHubCastRailProps {
  cast: HubCastMember[]
  actionsDisabled: boolean
  onResumeCharacter: (characterId: string) => void
  onCreateCharacter: () => void
  onViewObituary: (characterId: string) => void
}

export function CampaignHubCastRail(props: CampaignHubCastRailProps): JSX.Element {
  return (
    <aside className="campaign-hub-cast-rail" aria-label="Character cast">
      <header className="campaign-hub-cast-header">
        <h2>Cast</h2>
      </header>

      <ul className="campaign-hub-cast-list">
        {props.cast.map((member) => (
          <li key={member.id} className="campaign-hub-cast-card">
            <CampaignHubCastCard
              member={member}
              actionsDisabled={props.actionsDisabled}
              onResumeCharacter={props.onResumeCharacter}
              onViewObituary={props.onViewObituary}
            />
          </li>
        ))}
      </ul>

      <footer className="campaign-hub-cast-footer">
        <button
          type="button"
          className="campaign-hub-create-character"
          disabled={props.actionsDisabled}
          onClick={props.onCreateCharacter}
        >
          Create new character
        </button>
      </footer>
    </aside>
  )
}

function CampaignHubCastPresence(props: { member: HubCastMember }): JSX.Element {
  const { member } = props
  return (
    <>
      {/* EPIC-133 */}
      <p className="campaign-hub-cast-last-active">
        {formatLastActiveLabel(member.lastActiveInGameDate)}
      </p>
      {member.awayBlurb ? (
        <p className="campaign-hub-cast-away">{member.awayBlurb}</p>
      ) : null}
    </>
  )
}

export function CampaignHubCastCard(props: {
  member: HubCastMember
  actionsDisabled: boolean
  onResumeCharacter: (characterId: string) => void
  onViewObituary: (characterId: string) => void
}): JSX.Element {
  const { member } = props
  const isDead = member.lifeStatus === 'dead'
  const displayName = isDead ? `☠ ${member.name}` : member.name

  return (
    <article className={isDead ? 'campaign-hub-cast-card--dead' : 'campaign-hub-cast-card--alive'}>
      <div className="campaign-hub-cast-portrait">
        {member.portraitPath ? (
          <img src={member.portraitPath} alt="" />
        ) : (
          <span className="campaign-hub-cast-portrait-placeholder" aria-hidden="true" />
        )}
      </div>
      <div className="campaign-hub-cast-details">
        <h3>{displayName}</h3>
        <p className="campaign-hub-cast-meta">
          Level {member.level} {member.characterClass}
        </p>
        {member.lastKnownRegionName ? (
          <p className="campaign-hub-cast-region">Last seen: {member.lastKnownRegionName}</p>
        ) : null}
        <CampaignHubCastPresence member={member} />
        {isDead ? (
          <button
            type="button"
            className="campaign-hub-view-obituary"
            onClick={() => props.onViewObituary(member.id)}
          >
            View obituary
          </button>
        ) : (
          <button
            type="button"
            className="campaign-hub-resume"
            disabled={props.actionsDisabled}
            onClick={() => props.onResumeCharacter(member.id)}
          >
            Resume
          </button>
        )}
      </div>
    </article>
  )
}
