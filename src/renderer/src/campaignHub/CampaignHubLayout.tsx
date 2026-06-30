import type { ReactNode } from 'react'
import type { PlayAwareHubSnapshot } from '../../../shared/campaignHub/types'
import { CampaignHubCastRail } from './CampaignHubCastRail'
import { CampaignHubObituaryModal } from './CampaignHubObituaryModal'
import { CampaignHubWorldPreview } from './CampaignHubWorldPreview'
import { hubPremiseSnippet } from './hubUtils'
import './campaignHub.css'

export interface CampaignHubLayoutProps {
  snapshot: PlayAwareHubSnapshot
  lastPlayed: string
  sidebar?: ReactNode
  actionsDisabled: boolean
  obituaryCharacterId: string | null
  onResumeCharacter: (characterId: string) => void
  onCreateCharacter: () => void
  onViewObituary: (characterId: string) => void
  onCloseObituary: () => void
}

export function CampaignHubLayout(props: CampaignHubLayoutProps): JSX.Element {
  const campaign = props.snapshot.campaign
  const obituaryMember = props.obituaryCharacterId
    ? props.snapshot.cast.find((member) => member.id === props.obituaryCharacterId)
    : undefined

  return (
    <div className="campaign-hub">
      {props.sidebar ? <div className="campaign-hub-sidebar">{props.sidebar}</div> : null}
      <div className="campaign-hub-body">
        <main className="campaign-hub-center">
          <header className="campaign-hub-header">
            <h1>{campaign?.name ?? 'Campaign'}</h1>
            {campaign?.premisePrompt ? (
              <p className="campaign-hub-premise">{hubPremiseSnippet(campaign.premisePrompt)}</p>
            ) : null}
            {props.lastPlayed ? (
              <p className="campaign-hub-last-played">Last played: {props.lastPlayed}</p>
            ) : null}
          </header>
          <CampaignHubWorldPreview snapshot={props.snapshot} />
        </main>
        <CampaignHubCastRail
          cast={props.snapshot.cast}
          actionsDisabled={props.actionsDisabled}
          onResumeCharacter={props.onResumeCharacter}
          onCreateCharacter={props.onCreateCharacter}
          onViewObituary={props.onViewObituary}
        />
      </div>
      {props.obituaryCharacterId ? (
        <CampaignHubObituaryModal member={obituaryMember} onClose={props.onCloseObituary} />
      ) : null}
    </div>
  )
}
