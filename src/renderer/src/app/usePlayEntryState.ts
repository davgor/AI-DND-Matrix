import { useState } from 'react'
import type { CampaignDetail } from '../../../main/campaignIpc'
import { canEnterPlay, type OnboardingStage } from '../../../shared/guidedCreation/stageRouting'
import { guardPlayEntry } from '../../../shared/campaignPlay/campaignPlayReady'
import { createEnterPlayHandler } from '../onboarding/enterPlayHandler'

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
    if (!guardPlayEntry(input.detail, setEnterPlayBlockerMessage)) {
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
    handleEnterPlay
  }
}
