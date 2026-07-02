import type { Character } from '../../../db/repositories/characters'
import { CharacterLogBookModal } from '../characterSheet/CharacterLogBookModal'
import { QuestLogModal } from '../characterSheet/QuestLogModal'
import { SpellbookModal } from '../characterSheet/SpellbookModal'
import { CharacterSheetOverlay } from '../characterSheet/CharacterSheetOverlay'
import { InventoryModal } from '../characterSheet/InventoryModal'
import { PlaySheetJournalTab } from './playSheetJournalOverlay'
import { usePlaySheetModals } from './usePlaySheetModals'

export { usePlaySheetModals }

export function PlaySheetModals(props: {
  character: Character
  campaignId: string
  refreshToken: number
  modals: ReturnType<typeof usePlaySheetModals>
}): JSX.Element {
  return (
    <>
      <CharacterSheetOverlay
        character={props.character}
        isOpen={props.modals.sheetOpen}
        refreshToken={props.refreshToken}
        onClose={props.modals.closeSheet}
        onOpenInventory={(slot) => props.modals.openInventory(slot ?? null)}
      />
      <InventoryModal
        character={props.character}
        isOpen={props.modals.inventoryOpen}
        filterSlot={props.modals.inventoryFilterSlot}
        onClose={props.modals.closeInventory}
      />
      <CharacterLogBookModal
        character={props.character}
        isOpen={props.modals.logBookOpen}
        refreshToken={props.refreshToken}
        onClose={props.modals.closeLogBook}
      />
      <PlaySheetJournalTab
        character={props.character}
        isOpen={props.modals.journalOpen}
        onClose={props.modals.closeJournal}
      />
      <QuestLogModal
        character={props.character}
        campaignId={props.campaignId}
        isOpen={props.modals.questLogOpen}
        refreshToken={props.refreshToken}
        onClose={props.modals.closeQuestLog}
      />
      <SpellbookModal
        character={props.character}
        isOpen={props.modals.spellbookOpen}
        refreshToken={props.refreshToken}
        onClose={props.modals.closeSpellbook}
      />
    </>
  )
}
