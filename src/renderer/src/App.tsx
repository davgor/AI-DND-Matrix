import { useRef, useState, type RefObject } from 'react'
import type { CampaignDetail } from '../../main/campaignIpc'
import { findGuidedCreationPlayer, type OnboardingStage } from '../../shared/guidedCreation/stageRouting'
import './app.css'
import { CampaignDeleteModal } from './campaignDelete/CampaignDeleteModal'
import { useCampaignDeleteFlow } from './campaignDelete/useCampaignDeleteFlow'
import { CampaignStartModal } from './campaignStart/CampaignStartModal'
import { useCampaignStartFlow } from './campaignStart/useCampaignStartFlow'
import { ReadyAppHubRoute } from './app/ReadyAppHubRoute'
import { ReadyAppOnboardingView } from './app/ReadyAppOnboardingView'
import { ReadyAppPlayView } from './app/ReadyAppPlayView'
import { useReadyAppBodyState } from './app/useReadyAppBody'
import type { useSidebarController } from './sidebar/useSidebarController'
import { SettingsIntroModal } from './settingsIntro/SettingsIntroModal'
import { useSettingsIntro } from './settingsIntro/useSettingsIntro'
import { Titlebar } from './titlebar/Titlebar'
import { LoadingScreen } from './startup/LoadingScreen'
import { useStartupBoot } from './startup/useStartupBoot'
import { UpdateBanner } from './autoUpdate/UpdateBanner'
import { useSpellcheckOnEditableFields } from './spellcheck/useSpellcheckOnEditableFields'

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

async function refreshCampaignDetail(props: ReadyAppShellProps): Promise<void> {
  if (props.detail?.campaign) {
    props.setDetail(await window.campaigns.select(props.detail.campaign.id))
  }
}

function createRefreshAndAdvanceHandler(
  props: ReadyAppShellProps,
  nextStage: OnboardingStage
): () => Promise<void> {
  return async () => {
    await refreshCampaignDetail(props)
    props.setStage(nextStage)
  }
}

function createRevertRefreshAndAdvanceHandler(
  props: ReadyAppShellProps,
  targetPhase: 'race' | 'background',
  nextStage: OnboardingStage
): () => Promise<void> {
  return async () => {
    if (props.detail?.characters) {
      await revertOnboardingPhase(props.detail.characters, targetPhase)
    }
    await refreshCampaignDetail(props)
    props.setStage(nextStage)
  }
}

async function handleEquipmentSelectionComplete(props: ReadyAppShellProps): Promise<void> {
  await createRefreshAndAdvanceHandler(props, 'guidedIdentity')()
}

async function revertOnboardingPhase(
  characters: CampaignDetail['characters'],
  targetPhase: 'race' | 'background'
): Promise<void> {
  const player = findGuidedCreationPlayer(characters)
  if (player?.id && window.guidedCreation?.revertPhase) {
    await window.guidedCreation.revertPhase({ characterId: player.id, targetPhase })
  }
}

async function handleEquipmentSelectionBack(props: ReadyAppShellProps): Promise<void> {
  await createRevertRefreshAndAdvanceHandler(props, 'background', 'backgroundSelection')()
}

function renderOnboarding(props: ReadyAppShellProps, body: ReturnType<typeof useReadyAppBodyState>): JSX.Element {
  const campaignCallbacks = {
    onCampaignSelected: body.onCampaignSelected,
    onOpenNewCampaign: props.campaignStart.open,
    onRequestDelete: props.campaignDelete.open
  }
  return (
    <ReadyAppOnboardingView
      sidebarRef={props.sidebarRef}
      stage={props.stage}
      detail={props.detail}
      campaignCallbacks={campaignCallbacks}
      onDetailChange={props.setDetail}
      onReviewContinue={() => props.setStage('characterSetup')}
      onCharacterSetupComplete={() => void handleCharacterSetupComplete(props)()}
      onRaceSelectionComplete={() => void handleRaceSelectionComplete(props)()}
      onRaceSelectionBack={() => void handleRaceSelectionBack(props)()}
      onBackgroundSelectionComplete={() => void handleBackgroundSelectionComplete(props)()}
      onBackgroundSelectionBack={() => void handleBackgroundSelectionBack(props)()}
      onEquipmentSelectionComplete={() => void handleEquipmentSelectionComplete(props)}
      onEquipmentSelectionBack={() => void handleEquipmentSelectionBack(props)}
      onGuidedIdentityAdvance={() => props.setStage('guidedOpeningScene')}
      onEnterPlay={() => body.handleEnterPlay()}
      enterPlayBlockerMessage={body.enterPlayBlockerMessage}
      onRefreshDetail={body.refreshDetail}
    />
  )
}

function ReadyAppBody(props: ReadyAppShellProps): JSX.Element {
  const body = useReadyAppBodyState(props)
  const campaignCallbacks = {
    onCampaignSelected: body.onCampaignSelected,
    onOpenNewCampaign: props.campaignStart.open,
    onRequestDelete: props.campaignDelete.open
  }

  if (body.inCampaign && body.activePlayer) {
    return (
      <ReadyAppPlayView
        detail={props.detail!}
        body={body}
        sidebarRef={props.sidebarRef}
        campaignCallbacks={campaignCallbacks}
      />
    )
  }

  if (props.stage === 'campaignHub' && props.detail && body.hubSnapshot) {
    return (
      <ReadyAppHubRoute
        sidebarRef={props.sidebarRef}
        detail={props.detail}
        stage={props.stage}
        setDetail={props.setDetail}
        setStage={props.setStage}
        body={body}
        campaignCallbacks={campaignCallbacks}
        onCharacterSetupComplete={() => void handleCharacterSetupComplete(props)()}
      />
    )
  }

  return renderOnboarding(props, body)
}

const handleCharacterSetupComplete = (props: ReadyAppShellProps) =>
  createRefreshAndAdvanceHandler(props, 'raceSelection')
const handleRaceSelectionComplete = (props: ReadyAppShellProps) =>
  createRefreshAndAdvanceHandler(props, 'backgroundSelection')
const handleBackgroundSelectionComplete = (props: ReadyAppShellProps) =>
  createRefreshAndAdvanceHandler(props, 'equipmentSelection')
const handleBackgroundSelectionBack = (props: ReadyAppShellProps) =>
  createRevertRefreshAndAdvanceHandler(props, 'race', 'raceSelection')
const handleRaceSelectionBack = (props: ReadyAppShellProps) =>
  createRefreshAndAdvanceHandler(props, 'characterSetup')

function ReadyAppShell(props: ReadyAppShellProps): JSX.Element {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsIntro = useSettingsIntro(true, settingsOpen, setSettingsOpen)

  return (
    <div className="app-root">
      <Titlebar
        highlightSettings={settingsIntro.highlightSettings}
        settingsOpen={settingsOpen}
        onSettingsOpenChange={settingsIntro.handleSettingsOpenChange}
      />
      <div className="app-body">
        <ReadyAppBody {...props} />
      </div>
      {settingsIntro.visible ? (
        <SettingsIntroModal
          onDismiss={settingsIntro.dismiss}
          onOpenSettings={settingsIntro.openSettings}
        />
      ) : null}
      <CampaignStartModal
        flow={props.campaignStart}
        onSuccess={(created) => void props.onCampaignCreated(created)}
      />
      <CampaignDeleteModal flow={props.campaignDelete} />
      <UpdateBanner />
    </div>
  )
}

export function App(): JSX.Element {
  useSpellcheckOnEditableFields()
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
        <UpdateBanner />
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
