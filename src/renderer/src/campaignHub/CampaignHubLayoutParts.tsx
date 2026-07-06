import type { Campaign } from '../../../db/repositories/campaigns'
import type { HubCastMember } from '../../../shared/campaignHub/types'
import { CampaignHubObituaryModal } from './CampaignHubObituaryModal'
import { CampaignHubWorldHistoryModal } from './CampaignHubWorldHistoryModal'
import { hubPremiseSnippet } from './hubUtils'

export function CampaignHubModals(props: {
  worldHistoryOpen: boolean
  worldHistory: string | null | undefined
  onCloseWorldHistory: () => void
  obituaryCharacterId: string | null
  obituaryMember: HubCastMember | undefined
  onCloseObituary: () => void
}): JSX.Element {
  return (
    <>
      {props.worldHistoryOpen && props.worldHistory ? (
        <CampaignHubWorldHistoryModal
          worldHistory={props.worldHistory}
          onClose={props.onCloseWorldHistory}
        />
      ) : null}
      {props.obituaryCharacterId ? (
        <CampaignHubObituaryModal member={props.obituaryMember} onClose={props.onCloseObituary} />
      ) : null}
    </>
  )
}

export function CampaignHubHeader(props: {
  campaign: Campaign | null
  lastPlayed: string
}): JSX.Element {
  const { campaign } = props
  return (
    <header className="campaign-hub-header">
      <h1>{campaign?.name ?? 'Campaign'}</h1>
      {campaign?.premisePrompt ? (
        <p className="campaign-hub-premise">{hubPremiseSnippet(campaign.premisePrompt)}</p>
      ) : null}
      {props.lastPlayed ? (
        <p className="campaign-hub-last-played">Last played: {props.lastPlayed}</p>
      ) : null}
    </header>
  )
}
