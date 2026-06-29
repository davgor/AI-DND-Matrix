import { useEffect, useState } from 'react'
import type { CreateCampaignProgress, CreateCampaignStage } from '../../../shared/campaignCreate/types'
import { mapCreateStageToPlayerMessage } from '../../../shared/campaignCreate/stageMessages'
import type { CampaignStartView } from '../../../shared/campaignCreate/stateMachine'

export function useCampaignCreateProgress(view: CampaignStartView) {
  const [progressStage, setProgressStage] = useState<CreateCampaignStage | null>(null)
  const [progressLabel, setProgressLabel] = useState('')

  useEffect(() => {
    if (view === 'closed') {
      return undefined
    }
    return window.campaigns.onCreateProgress((payload: CreateCampaignProgress) => {
      setProgressStage(payload.stage)
      setProgressLabel(mapCreateStageToPlayerMessage(payload.stage))
    })
  }, [view])

  function clearProgress(): void {
    setProgressStage(null)
    setProgressLabel('')
  }

  return { progressStage, progressLabel, setProgressLabel, clearProgress }
}
