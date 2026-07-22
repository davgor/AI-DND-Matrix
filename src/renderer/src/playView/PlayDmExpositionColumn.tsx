import type { InCampaignLayoutMode } from '../../../shared/inCampaignLayout/types'
import type { usePlayViewController } from './usePlayViewController'
import type { SceneSummaryInput } from '../../../shared/inCampaignLayout/sceneContext'
import { CombatStrip } from './CombatStrip'
import { DmExpositionPanel } from './DmExpositionPanel'
import { PlayStatusAlerts } from './PlayStatusAlerts'

export function PlayDmExpositionColumn(props: {
  layoutMode: InCampaignLayoutMode
  controller: ReturnType<typeof usePlayViewController>
  sceneContext: SceneSummaryInput
}): JSX.Element {
  const { controller } = props
  const compactHud = props.layoutMode === 'compact' || props.layoutMode === 'sheet-overlay'

  return (
    <DmExpositionPanel
      entries={controller.dmEntries}
      sceneContext={props.sceneContext}
      expositionStatus={controller.expositionStatus}
      onRetryExposition={controller.retryExposition}
      showRolls={controller.showRolls}
      lastCheck={controller.lastCheck}
      combatStrip={
        <CombatStrip
          combatState={controller.combatState}
          fleeOutcome={controller.fleeOutcome}
          compact={compactHud}
        />
      }
      statusAlerts={
        <PlayStatusAlerts
          pendingAlignmentShift={controller.pendingAlignmentShift}
          playerAlignment={controller.playerAlignment}
          playerImprisoned={controller.playerImprisoned}
          defeatDispositionNarration={controller.defeatDispositionNarration}
          xpNarration={controller.xpNarration}
          lootNarration={controller.lootNarration}
          lockoutNarration={controller.lockoutNarration}
          spellGrantNarration={controller.spellGrantNarration}
        />
      }
    />
  )
}
