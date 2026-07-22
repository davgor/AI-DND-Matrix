import type { Character } from '../../../db/repositories/characters'
import { PlaySheetModals } from './PlaySheetModals'
import type { usePlaySheetModals } from './usePlaySheetModals'
import {
  PLAY_SHEET_TAB_LABELS,
  PlaySheetTabPanel,
  type PlaySheetTab
} from './playSheetRailTabs'

export function PlaySheetRailBody(props: {
  character: Character
  onCharacterUpdated: (character: Character) => void
  activeTab: PlaySheetTab
  onSelectTab: (tab: PlaySheetTab) => void
  refreshToken: number
  modals: ReturnType<typeof usePlaySheetModals>
}): JSX.Element {
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
        onCharacterUpdated={props.onCharacterUpdated}
        refreshToken={props.refreshToken}
        onOpenLogBook={props.modals.openLogBook}
        onOpenQuestLog={props.modals.openQuestLog}
        onOpenInventory={() => props.modals.openInventory(null)}
        onOpenJournal={props.modals.openJournal}
        onOpenSpellbook={props.modals.openSpellbook}
        onOpenAskDm={props.modals.openAskDm}
      />
      <PlaySheetModals
        character={props.character}
        campaignId={props.character.campaignId}
        refreshToken={props.refreshToken}
        modals={props.modals}
      />
    </div>
  )
}
