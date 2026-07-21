import type { ReactNode } from 'react'
import type { PlayAwareHubSnapshot } from '../../../shared/campaignHub/types'
import { CampaignHubCastRail } from './CampaignHubCastRail'
import { CampaignHubHeader, CampaignHubModals } from './CampaignHubLayoutParts'
import { CampaignHubWorldPreview } from './CampaignHubWorldPreview'
import type { HubSessionRecapState } from './useHubSessionRecap'
import './campaignHub.css'

export interface CampaignHubLayoutProps {
  snapshot: PlayAwareHubSnapshot
  sessionRecap: HubSessionRecapState
  lastPlayed: string
  sidebar?: ReactNode
  actionsDisabled: boolean
  obituaryCharacterId: string | null
  worldHistoryOpen: boolean
  onViewWorldHistory: () => void
  onCloseWorldHistory: () => void
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
          <CampaignHubHeader campaign={campaign ?? null} lastPlayed={props.lastPlayed} />
          <CampaignHubWorldPreview
            snapshot={props.snapshot}
            sessionRecap={props.sessionRecap}
            onViewWorldHistory={props.onViewWorldHistory}
          />
        </main>
        <CampaignHubCastRail
          cast={props.snapshot.cast}
          actionsDisabled={props.actionsDisabled}
          onResumeCharacter={props.onResumeCharacter}
          onCreateCharacter={props.onCreateCharacter}
          onViewObituary={props.onViewObituary}
        />
      </div>
      <CampaignHubModals
        worldHistoryOpen={props.worldHistoryOpen}
        worldHistory={campaign?.worldHistory}
        onCloseWorldHistory={props.onCloseWorldHistory}
        obituaryCharacterId={props.obituaryCharacterId}
        obituaryMember={obituaryMember}
        onCloseObituary={props.onCloseObituary}
      />
    </div>
  )
}
