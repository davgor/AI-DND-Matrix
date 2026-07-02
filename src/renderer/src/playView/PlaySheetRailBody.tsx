import type { Character } from '../../../db/repositories/characters'
import { PlaySheetModals, usePlaySheetModals } from './PlaySheetModals'
import {
  PLAY_SHEET_TAB_LABELS,
  PlaySheetTabPanel,
  type PlaySheetTab
} from './playSheetRailTabs'

export function PlaySheetRailBody(props: {
  character: Character
  activeTab: PlaySheetTab
  onSelectTab: (tab: PlaySheetTab) => void
  refreshToken: number
}): JSX.Element {
  const modals = usePlaySheetModals()

  function handleTabSelect(tab: PlaySheetTab): void {
    props.onSelectTab(tab)
  }

  return (
    <div className="play-sheet-rail-body">
      <div className="play-sheet-tabs" role="tablist" aria-label="Character sheet sections">
        {(Object.keys(PLAY_SHEET_TAB_LABELS) as PlaySheetTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            data-tab={tab}
            aria-selected={props.activeTab === tab}
            className={props.activeTab === tab ? 'play-sheet-tab play-sheet-tab-active' : 'play-sheet-tab'}
            onClick={() => handleTabSelect(tab)}
          >
            {PLAY_SHEET_TAB_LABELS[tab]}
          </button>
        ))}
      </div>
      <PlaySheetTabPanel
        activeTab={props.activeTab}
        character={props.character}
        refreshToken={props.refreshToken}
        onOpenLogBook={modals.openLogBook}
        onOpenQuestLog={modals.openQuestLog}
        onOpenInventory={() => modals.openInventory(null)}
        onOpenJournal={modals.openJournal}
        onOpenSpellbook={modals.openSpellbook}
      />
      <PlaySheetModals
        character={props.character}
        campaignId={props.character.campaignId}
        refreshToken={props.refreshToken}
        modals={modals}
      />
    </div>
  )
}
