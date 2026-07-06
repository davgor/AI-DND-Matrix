import { useEffect, useState } from 'react'
import type { CreateCampaignProgress, CreateCampaignStage } from '../../../shared/campaignCreate/types'
import type { CampaignStartView } from '../../../shared/campaignCreate/stateMachine'

export function useCampaignCreateProgress(view: CampaignStartView) {
  const [progressStage, setProgressStage] = useState<CreateCampaignStage | null>(null)
  const [progressStageIndex, setProgressStageIndex] = useState(0)
  const [progressStageTotal, setProgressStageTotal] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')

  useEffect(() => {
    if (view === 'closed') {
      return undefined
    }
    return window.campaigns.onCreateProgress((payload: CreateCampaignProgress) => {
      setProgressStage(payload.stage)
      setProgressStageIndex(payload.stageIndex)
      setProgressStageTotal(payload.stageTotal)
      setProgressLabel(payload.statusText)
    })
  }, [view])

  function clearProgress(): void {
    setProgressStage(null)
    setProgressStageIndex(0)
    setProgressStageTotal(0)
    setProgressLabel('')
  }

  return {
    progressStage,
    progressStageIndex,
    progressStageTotal,
    progressLabel,
    setProgressLabel,
    clearProgress
  }
}
