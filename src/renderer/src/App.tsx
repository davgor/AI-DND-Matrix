import { useState } from 'react'
import type { CampaignDetail } from '../../main/campaignIpc'
import './app.css'
import { CampaignReview } from './campaignReview/CampaignReview'
import { CharacterSetup } from './characterSetup/CharacterSetup'
import { MainPanel } from './mainPanel/MainPanel'
import { PlayView } from './playView/PlayView'
import { Sidebar } from './sidebar/Sidebar'
import { Titlebar } from './titlebar/Titlebar'
import { LoadingScreen } from './startup/LoadingScreen'
import { useStartupBoot } from './startup/useStartupBoot'

type Stage = 'main' | 'review' | 'characterSetup'

interface StageContentProps {
  stage: Stage
  detail: CampaignDetail | null
  onDetailChange: (detail: CampaignDetail) => void
  onReviewContinue: () => void
  onCharacterSetupComplete: () => void
}

function MainStageContent(props: { detail: CampaignDetail | null }): JSX.Element {
  const { detail } = props
  const playerCharacter = detail?.characters.find((character) => character.kind === 'player')
  if (detail?.campaign && playerCharacter) {
    return <PlayView campaignId={detail.campaign.id} characterId={playerCharacter.id} />
  }
  return <MainPanel detail={detail} />
}

function StageContent(props: StageContentProps): JSX.Element {
  const { stage, detail } = props

  if (stage === 'review' && detail) {
    return (
      <CampaignReview detail={detail} onDetailChange={props.onDetailChange} onContinue={props.onReviewContinue} />
    )
  }
  if (stage === 'characterSetup' && detail?.campaign) {
    return <CharacterSetup campaignId={detail.campaign.id} onComplete={props.onCharacterSetupComplete} />
  }
  return <MainStageContent detail={detail} />
}

export function App(): JSX.Element {
  const boot = useStartupBoot()
  const [detail, setDetail] = useState<CampaignDetail | null>(null)
  const [stage, setStage] = useState<Stage>('main')
  const ready = boot.phase === 'ready'

  function handleSelected(next: CampaignDetail): void {
    setDetail(next)
    setStage('main')
  }

  function handleGenerated(next: CampaignDetail): void {
    setDetail(next)
    setStage('review')
  }

  async function handleCharacterSetupComplete(): Promise<void> {
    if (detail?.campaign) {
      setDetail(await window.campaigns.select(detail.campaign.id))
    }
    setStage('main')
  }

  if (!ready) {
    return (
      <div className="app-root">
        <Titlebar />
        <LoadingScreen boot={boot} />
      </div>
    )
  }

  return (
    <div className="app-root">
      <Titlebar />
      <div className="app-body">
        <Sidebar
          selectedCampaignId={detail?.campaign?.id ?? null}
          onCampaignSelected={handleSelected}
          onCampaignGenerated={handleGenerated}
        />
        <StageContent
          stage={stage}
          detail={detail}
          onDetailChange={setDetail}
          onReviewContinue={() => setStage('characterSetup')}
          onCharacterSetupComplete={() => void handleCharacterSetupComplete()}
        />
      </div>
    </div>
  )
}
