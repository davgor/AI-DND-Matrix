import { useState } from 'react'
import type { CampaignDetail } from '../../../main/campaignIpc'
import {
  campaignPlayBlockerMessage,
  canEnterCampaignPlay,
  getCampaignPlayBlockers
} from '../../../shared/campaignPlay/campaignPlayReady'
import { canEnterPlay, type OnboardingStage } from '../../../shared/guidedCreation/stageRouting'
import { createEnterPlayHandler } from '../onboarding/enterPlayHandler'
import { createReadyToEnterPlayHandler } from '../onboarding/readyToEnterPlayHandler'

type PlayEntryInput = {
  detail: CampaignDetail | null
  stage: OnboardingStage
  setStage: (stage: OnboardingStage) => void
  activeCharacterId: string | null
  setActiveCharacterId: (id: string | null) => void
  refreshDetail: () => Promise<void>
}

function createResumeFromHubHandler(
  input: PlayEntryInput,
  setEnterPlayBlockerMessage: (message: string | null) => void
): (characterId: string) => void {
  return (characterId: string) => {
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
}

function createReadyToEnterPlayFactory(input: PlayEntryInput, setEnterPlayBlockerMessage: (message: string | null) => void) {
  return (characterId: string): () => Promise<void> => {
    if (!input.detail?.campaign) {
      return async () => {}
    }
    return createReadyToEnterPlayHandler({
      detail: input.detail,
      campaignId: input.detail.campaign.id,
      characterId,
      refreshDetail: input.refreshDetail,
      setEnterPlayBlockerMessage,
      onEnterPlay: (id) => {
        input.setActiveCharacterId(id)
        input.setStage('main')
      }
    })
  }
}

export function usePlayEntryState(input: PlayEntryInput) {
  const [enterPlayBlockerMessage, setEnterPlayBlockerMessage] = useState<string | null>(null)

  const activePlayer = input.detail?.characters.find(
    (character) => character.id === input.activeCharacterId && character.kind === 'player'
  )
  const inCampaign =
    input.stage === 'main' &&
    Boolean(input.detail?.campaign) &&
    Boolean(activePlayer) &&
    canEnterPlay(activePlayer)

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
    handleResumeFromHub: createResumeFromHubHandler(input, setEnterPlayBlockerMessage),
    handleEnterPlay,
    createHandleReadyToEnterPlay: createReadyToEnterPlayFactory(input, setEnterPlayBlockerMessage)
  }
}
