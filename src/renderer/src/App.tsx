import { useState } from 'react'
import type { CampaignDetail } from '../../main/campaignIpc'
import './app.css'
import { CampaignReview } from './campaignReview/CampaignReview'
import { CharacterSetup } from './characterSetup/CharacterSetup'
import { MainPanel } from './mainPanel/MainPanel'
import { Sidebar } from './sidebar/Sidebar'
import { Titlebar } from './titlebar/Titlebar'

type Stage = 'main' | 'review' | 'characterSetup'

export function App(): JSX.Element {
  const [detail, setDetail] = useState<CampaignDetail | null>(null)
  const [stage, setStage] = useState<Stage>('main')

  function handleSelected(next: CampaignDetail): void {
    setDetail(next)
    setStage('main')
  }

  function handleGenerated(next: CampaignDetail): void {
    setDetail(next)
    setStage('review')
  }

  return (
    <div>
      <Titlebar />
      <div className="app-body">
        <Sidebar
          selectedCampaignId={detail?.campaign?.id ?? null}
          onCampaignSelected={handleSelected}
          onCampaignGenerated={handleGenerated}
        />
        {stage === 'review' && detail && (
          <CampaignReview
            detail={detail}
            onDetailChange={setDetail}
            onContinue={() => setStage('characterSetup')}
          />
        )}
        {stage === 'characterSetup' && detail?.campaign && (
          <CharacterSetup
            campaignId={detail.campaign.id}
            onComplete={() => setStage('main')}
          />
        )}
        {stage === 'main' && <MainPanel detail={detail} />}
      </div>
    </div>
  )
}
