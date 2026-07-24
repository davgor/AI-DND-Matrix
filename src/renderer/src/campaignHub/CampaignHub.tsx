import { useState } from 'react'
import type { PlayAwareHubSnapshot } from '../../../shared/campaignHub/types'
import { CampaignHubLayout } from './CampaignHubLayout'
import { useHubSessionRecap } from './useHubSessionRecap'

export interface CampaignHubProps {
  snapshot: PlayAwareHubSnapshot
  lastPlayed: string
  imageProviderReady: boolean
  onResumeCharacter: (characterId: string) => void
  onCreateCharacter: () => void
  onGenerateRegion: () => void
}

export function CampaignHub(props: CampaignHubProps): JSX.Element {
  const [obituaryCharacterId, setObituaryCharacterId] = useState<string | null>(null)
  const [worldHistoryOpen, setWorldHistoryOpen] = useState(false)
  const sessionRecap = useHubSessionRecap(props.snapshot.campaign?.id)
  const imageProviderMismatch =
    props.snapshot.campaign?.generativeTokensEnabled === true && !props.imageProviderReady

  return (
    <CampaignHubLayout
      snapshot={props.snapshot}
      sessionRecap={sessionRecap}
      lastPlayed={props.lastPlayed}
      actionsDisabled={obituaryCharacterId !== null || imageProviderMismatch}
      imageProviderMismatch={imageProviderMismatch}
      obituaryCharacterId={obituaryCharacterId}
      worldHistoryOpen={worldHistoryOpen}
      onViewWorldHistory={() => setWorldHistoryOpen(true)}
      onCloseWorldHistory={() => setWorldHistoryOpen(false)}
      onResumeCharacter={props.onResumeCharacter}
      onCreateCharacter={props.onCreateCharacter}
      onViewObituary={setObituaryCharacterId}
      onCloseObituary={() => setObituaryCharacterId(null)}
    />
  )
}
