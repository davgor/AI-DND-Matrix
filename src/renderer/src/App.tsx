import { useRef, useState, type RefObject } from 'react'
import type { CampaignDetail } from '../../main/campaignIpc'
import './app.css'
import { CampaignDeleteModal } from './campaignDelete/CampaignDeleteModal'
import { useCampaignDeleteFlow } from './campaignDelete/useCampaignDeleteFlow'
import { CampaignReview } from './campaignReview/CampaignReview'
import { CharacterSetup } from './characterSetup/CharacterSetup'
import { CampaignStartModal } from './campaignStart/CampaignStartModal'
import { useCampaignStartFlow } from './campaignStart/useCampaignStartFlow'
import { MainPanel } from './mainPanel/MainPanel'
import { PlayView } from './playView/PlayView'
import { Sidebar } from './sidebar/Sidebar'
import type { useSidebarController } from './sidebar/useSidebarController'
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
  return <MainPanel detail={props.detail} />
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

function findPlayerCharacter(detail: CampaignDetail | null) {
  return detail?.characters.find((character) => character.kind === 'player') ?? null
}

interface ReadyAppShellProps {
  campaignStart: ReturnType<typeof useCampaignStartFlow>
  campaignDelete: ReturnType<typeof useCampaignDeleteFlow>
  sidebarRef: RefObject<ReturnType<typeof useSidebarController> | null>
  detail: CampaignDetail | null
  stage: Stage
  setDetail: (detail: CampaignDetail | null) => void
  setStage: (stage: Stage) => void
  onCampaignCreated: (detail: CampaignDetail) => Promise<void>
}

function ReadyAppBody(props: ReadyAppShellProps): JSX.Element {
  const playerCharacter = findPlayerCharacter(props.detail)
  const inCampaign =
    props.stage === 'main' && props.detail?.campaign && playerCharacter
  const campaignCallbacks = {
    onCampaignSelected: (next: CampaignDetail) => {
      props.setDetail(next)
      props.setStage('main')
    },
    onOpenNewCampaign: props.campaignStart.open,
    onRequestDelete: props.campaignDelete.open
  }

  if (inCampaign) {
    return (
      <PlayView
        campaignId={props.detail!.campaign!.id}
        characterId={playerCharacter!.id}
        selectedCampaignId={props.detail!.campaign!.id}
        sidebarRef={props.sidebarRef}
        {...campaignCallbacks}
      />
    )
  }

  return (
    <>
      <Sidebar sidebarRef={props.sidebarRef} selectedCampaignId={props.detail?.campaign?.id ?? null} {...campaignCallbacks} />
      <StageContent
        stage={props.stage}
        detail={props.detail}
        onDetailChange={props.setDetail}
        onReviewContinue={() => props.setStage('characterSetup')}
        onCharacterSetupComplete={() => void handleCharacterSetupComplete(props)}
      />
    </>
  )
}

async function handleCharacterSetupComplete(props: ReadyAppShellProps): Promise<void> {
  if (props.detail?.campaign) {
    props.setDetail(await window.campaigns.select(props.detail.campaign.id))
  }
  props.setStage('main')
}

function ReadyAppShell(props: ReadyAppShellProps): JSX.Element {
  return (
    <div className="app-root">
      <Titlebar />
      <div className="app-body">
        <ReadyAppBody {...props} />
      </div>
      <CampaignStartModal
        flow={props.campaignStart}
        onSuccess={(created) => void props.onCampaignCreated(created)}
      />
      <CampaignDeleteModal flow={props.campaignDelete} />
    </div>
  )
}

export function App(): JSX.Element {
  const boot = useStartupBoot()
  const campaignStart = useCampaignStartFlow()
  const sidebarRef = useRef<ReturnType<typeof useSidebarController> | null>(null)
  const [detail, setDetail] = useState<CampaignDetail | null>(null)
  const [stage, setStage] = useState<Stage>('main')
  const campaignDelete = useCampaignDeleteFlow(async (deletedId) => {
    setDetail((current) => {
      if (current?.campaign?.id === deletedId) {
        setStage('main')
        return null
      }
      return current
    })
    await sidebarRef.current?.refreshCampaigns()
  })

  async function handleCampaignCreated(next: CampaignDetail): Promise<void> {
    setDetail(next)
    setStage('review')
    await sidebarRef.current?.refreshCampaigns()
  }

  if (boot.phase !== 'ready') {
    return (
      <div className="app-root">
        <Titlebar />
        <LoadingScreen boot={boot} />
      </div>
    )
  }

  return (
    <ReadyAppShell
      campaignStart={campaignStart}
      campaignDelete={campaignDelete}
      sidebarRef={sidebarRef}
      detail={detail}
      stage={stage}
      setDetail={setDetail}
      setStage={setStage}
      onCampaignCreated={handleCampaignCreated}
    />
  )
}
