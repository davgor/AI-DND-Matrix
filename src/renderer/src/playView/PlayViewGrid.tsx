import type { ReactNode } from 'react'
import type { CampaignWithLastPlayed } from '../../../db/repositories/campaigns'
import type { PersonMatchCandidate } from '../../../shared/journal'
import { CampaignsRail } from '../sidebar/CampaignsRail'
import type { useSidebarController } from '../sidebar/useSidebarController'
import { useJournalPersonLinks } from '../characterSheet/useJournalPersonLinks'
import { PlaySheetRail } from './PlaySheetRail'
import { InCampaignLayout } from '../inCampaign/InCampaignLayout'
import type { InCampaignLayoutMode } from '../../../shared/inCampaignLayout/types'
import { PlayDmExpositionColumn } from './PlayDmExpositionColumn'
import { PlayerActionPanel } from './PlayerActionPanel'
import { usePlaySheetModals } from './usePlaySheetModals'
import type { usePlayViewController } from './usePlayViewController'

type PlayViewGridProps = {
  layoutMode: InCampaignLayoutMode
  campaignsController: ReturnType<typeof useSidebarController>
  selectedCampaignId: string | null
  onOpenNewCampaign: () => void
  onRequestDelete: (campaign: CampaignWithLastPlayed) => void
  controller: ReturnType<typeof usePlayViewController>
  campaignId: string
  characterId: string
  sheetCollapsed: boolean
  onToggleSheet: () => void
  sceneContext: { regionName: string | null; regionBlurb: string | null }
  showOverlayBackdrop: boolean
  onBackdropDismiss: () => void
  overlays?: ReactNode
}

function playDmColumn(input: {
  layoutMode: InCampaignLayoutMode
  controller: ReturnType<typeof usePlayViewController>
  sceneContext: { regionName: string | null; regionBlurb: string | null }
  personCandidates: PersonMatchCandidate[]
  onPersonActivate: (npcId: string) => void
}): JSX.Element {
  return (
    <PlayDmExpositionColumn
      layoutMode={input.layoutMode}
      controller={input.controller}
      sceneContext={input.sceneContext}
      personCandidates={input.personCandidates}
      onPersonActivate={input.onPersonActivate}
    />
  )
}

function playPlayerColumn(input: {
  controller: ReturnType<typeof usePlayViewController>
  characterId: string
  onOpenNpcDossier: (npcId: string) => void
  personCandidates: PersonMatchCandidate[]
}): JSX.Element {
  return (
    <PlayerActionPanel
      entries={input.controller.playerEntries}
      inputValue={input.controller.inputValue}
      onInputChange={input.controller.setInputValue}
      onSubmit={() => void input.controller.submitAction()}
      submitting={input.controller.submitting}
      inputBlocked={input.controller.obituaryBlocking}
      playerImprisoned={input.controller.playerImprisoned}
      combatState={input.controller.combatState}
      characterId={input.characterId}
      onOpenNpcDossier={input.onOpenNpcDossier}
      personCandidates={input.personCandidates}
    />
  )
}

function playSheetColumn(input: {
  campaignId: string
  characterId: string
  sheetCollapsed: boolean
  onToggleSheet: () => void
  refreshToken: number
  modals: ReturnType<typeof usePlaySheetModals>
}): JSX.Element {
  return (
    <PlaySheetRail
      campaignId={input.campaignId}
      characterId={input.characterId}
      collapsed={input.sheetCollapsed}
      onToggleCollapsed={input.onToggleSheet}
      refreshToken={input.refreshToken}
      modals={input.modals}
    />
  )
}

export function PlayViewGrid(props: PlayViewGridProps): JSX.Element {
  const modals = usePlaySheetModals()
  const { personCandidates } = useJournalPersonLinks(props.campaignId, props.characterId)

  return (
    <InCampaignLayout
      mode={props.layoutMode}
      campaignsCollapsed={props.campaignsController.collapsed}
      sheetCollapsed={props.sheetCollapsed}
      showOverlayBackdrop={props.showOverlayBackdrop}
      onBackdropDismiss={props.onBackdropDismiss}
      campaigns={
        <CampaignsRail
          controller={props.campaignsController}
          selectedCampaignId={props.selectedCampaignId}
          onOpenNewCampaign={props.onOpenNewCampaign}
          onRequestDelete={props.onRequestDelete}
        />
      }
      dmExposition={playDmColumn({
        layoutMode: props.layoutMode,
        controller: props.controller,
        sceneContext: props.sceneContext,
        personCandidates,
        onPersonActivate: modals.openDossier
      })}
      playerInteraction={playPlayerColumn({
        controller: props.controller,
        characterId: props.characterId,
        onOpenNpcDossier: modals.openDossier,
        personCandidates
      })}
      playerSheet={playSheetColumn({
        campaignId: props.campaignId,
        characterId: props.characterId,
        sheetCollapsed: props.sheetCollapsed,
        onToggleSheet: props.onToggleSheet,
        refreshToken: props.controller.characterRefreshToken,
        modals
      })}
      overlays={props.overlays}
    />
  )
}
