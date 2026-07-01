import type { InCampaignLayoutMode } from '../../../shared/inCampaignLayout/types'
import type { usePlayViewController } from './usePlayViewController'
import { CombatHud } from './CombatHud'
import { DmExpositionPanel } from './DmExpositionPanel'

export function PlayDmExpositionColumn(props: {
  layoutMode: InCampaignLayoutMode
  controller: ReturnType<typeof usePlayViewController>
}): JSX.Element {
  const { controller } = props
  return (
    <>
      <CombatHud
        combatState={controller.combatState}
        fleeOutcome={controller.fleeOutcome}
        compact={props.layoutMode === 'narrow'}
      />
      <DmExpositionPanel
        sceneText={controller.sceneText}
        flavorEntries={controller.dmFlavorEntries}
        expositionStatus={controller.expositionStatus}
        onRetryExposition={controller.retryExposition}
        showRolls={controller.showRolls}
        onToggleShowRolls={controller.toggleShowRolls}
        lastCheck={controller.lastCheck}
        pendingAlignmentShift={controller.pendingAlignmentShift}
        playerAlignment={controller.playerAlignment}
        defeatDispositionNarration={controller.defeatDispositionNarration}
        xpNarration={controller.xpNarration}
        lootNarration={controller.lootNarration}
        playerImprisoned={controller.playerImprisoned}
      />
    </>
  )
}
