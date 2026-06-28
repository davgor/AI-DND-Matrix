import { CharacterSheet } from '../characterSheet/CharacterSheet'
import { DmNarrationPanel } from './DmNarrationPanel'
import { PlayerActionPanel } from './PlayerActionPanel'
import { PromotionPrompt } from './PromotionPrompt'
import { RecapBanner } from './RecapBanner'
import { usePlayViewController } from './usePlayViewController'
import './playView.css'

export interface PlayViewProps {
  campaignId: string
  characterId: string
}

export function PlayView(props: PlayViewProps): JSX.Element {
  const controller = usePlayViewController(props.campaignId, props.characterId)
  const dmEntries = controller.log.filter((entry) => entry.speaker !== 'player')
  const playerEntries = controller.log.filter((entry) => entry.speaker === 'player')

  return (
    <div className="play-view">
      <RecapBanner recap={controller.recap} />
      <PromotionPrompt promotion={controller.promotion} />
      <button type="button" className="play-view-sheet-toggle" onClick={controller.toggleSheet}>
        Character Sheet
      </button>
      <DmNarrationPanel
        entries={dmEntries}
        showRolls={controller.showRolls}
        onToggleShowRolls={controller.toggleShowRolls}
        lastCheck={controller.lastCheck}
      />
      <PlayerActionPanel
        entries={playerEntries}
        inputValue={controller.inputValue}
        onInputChange={controller.setInputValue}
        onSubmit={() => void controller.submitAction()}
        submitting={controller.submitting}
      />
      <CharacterSheet campaignId={props.campaignId} isOpen={controller.sheetOpen} onClose={controller.closeSheet} />
    </div>
  )
}
