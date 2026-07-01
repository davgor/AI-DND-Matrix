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

  return (
    <>
      <div className="play-sheet-tabs" role="tablist" aria-label="Character sheet sections">
        {(Object.keys(PLAY_SHEET_TAB_LABELS) as PlaySheetTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={props.activeTab === tab}
            className={props.activeTab === tab ? 'play-sheet-tab play-sheet-tab-active' : 'play-sheet-tab'}
            onClick={() => {
              props.onSelectTab(tab)
              if (tab === 'gear') {
                modals.openSheet()
              }
            }}
          >
            {PLAY_SHEET_TAB_LABELS[tab]}
          </button>
        ))}
      </div>
      <PlaySheetTabPanel
        activeTab={props.activeTab}
        character={props.character}
        onOpenSheet={modals.openSheet}
        onOpenLogBook={modals.openLogBook}
        onOpenQuestLog={modals.openQuestLog}
      />
      <button type="button" className="play-sheet-open-full" onClick={modals.openSheet}>
        Open character sheet
      </button>
      <PlaySheetModals
        character={props.character}
        campaignId={props.character.campaignId}
        refreshToken={props.refreshToken}
        modals={modals}
      />
    </>
  )
}
