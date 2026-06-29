import { useRef, useState, type RefObject } from 'react'
import type { CampaignDetail } from '../../main/campaignIpc'
import {
  canEnterPlay,
  findPlayerCharacter,
  stageAfterCampaignSelect,
  type OnboardingStage
} from '../../shared/guidedCreation/stageRouting'
import './app.css'
import { CampaignDeleteModal } from './campaignDelete/CampaignDeleteModal'
import { useCampaignDeleteFlow } from './campaignDelete/useCampaignDeleteFlow'
import { CampaignStartModal } from './campaignStart/CampaignStartModal'
import { useCampaignStartFlow } from './campaignStart/useCampaignStartFlow'
import { OnboardingStageContent } from './onboarding/OnboardingStageContent'
import { PlayView } from './playView/PlayView'
import { Sidebar } from './sidebar/Sidebar'
import type { useSidebarController } from './sidebar/useSidebarController'
import { Titlebar } from './titlebar/Titlebar'
import { LoadingScreen } from './startup/LoadingScreen'
import { useStartupBoot } from './startup/useStartupBoot'

interface ReadyAppShellProps {
  campaignStart: ReturnType<typeof useCampaignStartFlow>
  campaignDelete: ReturnType<typeof useCampaignDeleteFlow>
  sidebarRef: RefObject<ReturnType<typeof useSidebarController> | null>
  detail: CampaignDetail | null
  stage: OnboardingStage
  setDetail: (detail: CampaignDetail | null) => void
  setStage: (stage: OnboardingStage) => void
  onCampaignCreated: (detail: CampaignDetail) => Promise<void>
}

function ReadyAppBody(props: ReadyAppShellProps): JSX.Element {
  const playerCharacter = findPlayerCharacter(props.detail?.characters ?? [])
  const inCampaign =
    props.stage === 'main' && props.detail?.campaign && canEnterPlay(playerCharacter)
  const campaignCallbacks = {
    onCampaignSelected: (next: CampaignDetail) => {
      props.setDetail(next)
      props.setStage(stageAfterCampaignSelect(next.characters))
    },
    onOpenNewCampaign: props.campaignStart.open,
    onRequestDelete: props.campaignDelete.open
  }

  async function refreshDetail(): Promise<void> {
    if (!props.detail?.campaign) {
      return
    }
    props.setDetail(await window.campaigns.select(props.detail.campaign.id))
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
      <OnboardingStageContent
        stage={props.stage}
        detail={props.detail}
        onDetailChange={props.setDetail}
        onReviewContinue={() => props.setStage('characterSetup')}
        onCharacterSetupComplete={() => void handleCharacterSetupComplete(props)}
        onGuidedIdentityAdvance={() => props.setStage('guidedOpeningScene')}
        onEnterPlay={() => props.setStage('main')}
        onRefreshDetail={refreshDetail}
      />
    </>
  )
}

async function handleCharacterSetupComplete(props: ReadyAppShellProps): Promise<void> {
  if (props.detail?.campaign) {
    props.setDetail(await window.campaigns.select(props.detail.campaign.id))
  }
  props.setStage('guidedIdentity')
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
  const [stage, setStage] = useState<OnboardingStage>('main')
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
