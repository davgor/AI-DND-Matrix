import { useState } from 'react'
import type { CampaignDetail } from '../../../main/campaignIpc'
import {
  campaignPlayBlockerMessage,
  canEnterCampaignPlay,
  getCampaignPlayBlockers
} from '../../../shared/campaignPlay/campaignPlayReady'
import { canEnterPlay, type OnboardingStage } from '../../../shared/guidedCreation/stageRouting'
import { createEnterPlayHandler } from '../onboarding/enterPlayHandler'

export function usePlayEntryState(input: {
  detail: CampaignDetail | null
  stage: OnboardingStage
  setStage: (stage: OnboardingStage) => void
  activeCharacterId: string | null
  setActiveCharacterId: (id: string | null) => void
}) {
  const [enterPlayBlockerMessage, setEnterPlayBlockerMessage] = useState<string | null>(null)

  const activePlayer = input.detail?.characters.find(
    (character) => character.id === input.activeCharacterId && character.kind === 'player'
  )
  const inCampaign =
    input.stage === 'main' &&
    Boolean(input.detail?.campaign) &&
    Boolean(activePlayer) &&
    canEnterPlay(activePlayer)

  function handleResumeFromHub(characterId: string): void {
    if (!input.detail) {
      return
    }
    const blockers = getCampaignPlayBlockers(input.detail)
    if (!canEnterCampaignPlay(input.detail)) {
      setEnterPlayBlockerMessage(campaignPlayBlockerMessage(blockers))
      return
    }
    const character = input.detail.characters.find((entry) => entry.id === characterId)
    if (!character || character.lifeStatus === 'dead' || !canEnterPlay(character)) {
      return
    }
    setEnterPlayBlockerMessage(null)
    input.setActiveCharacterId(characterId)
    input.setStage('main')
  }

  const handleEnterPlay = createEnterPlayHandler({
    detail: input.detail,
    setEnterPlayBlockerMessage,
    onEnterPlay: (characterId) => {
      input.setActiveCharacterId(characterId)
      input.setStage('main')
    }
  })

  return {
    activePlayer,
    inCampaign,
    enterPlayBlockerMessage,
    handleResumeFromHub,
    handleEnterPlay
  }
}
