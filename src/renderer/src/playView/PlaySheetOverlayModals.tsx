import type { Character } from '../../../db/repositories/characters'
import { CharacterLogBookModal } from '../characterSheet/CharacterLogBookModal'
import { QuestLogModal } from '../characterSheet/QuestLogModal'
import { SpellbookModal } from '../characterSheet/SpellbookModal'
import { AskDmModal } from './AskDmModal'
import { CharacterSheetOverlay } from '../characterSheet/CharacterSheetOverlay'
import { InventoryModal } from '../characterSheet/InventoryModal'
import { PlaySheetJournalTab } from './playSheetJournalOverlay'
import type { usePlaySheetModals } from './usePlaySheetModals'

export function PlaySheetSheetModals(props: {
  character: Character
  campaignId: string
  refreshToken: number
  modals: ReturnType<typeof usePlaySheetModals>
}): JSX.Element {
  return (
    <>
      <CharacterSheetOverlay
        character={props.character}
        campaignId={props.campaignId}
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
    </>
  )
}

export function PlaySheetKnowledgeModals(props: {
  character: Character
  campaignId: string
  refreshToken: number
  modals: ReturnType<typeof usePlaySheetModals>
}): JSX.Element {
  return (
    <>
      <CharacterLogBookModal
        character={props.character}
        isOpen={props.modals.logBookOpen}
        refreshToken={props.refreshToken}
        onClose={props.modals.closeLogBook}
        onOpenNpcDossier={props.modals.openDossier}
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
      <AskDmModal
        character={props.character}
        campaignId={props.campaignId}
        isOpen={props.modals.askDmOpen}
        onClose={props.modals.closeAskDm}
      />
    </>
  )
}

export function PlaySheetOverlayModals(props: {
  character: Character
  campaignId: string
  refreshToken: number
  modals: ReturnType<typeof usePlaySheetModals>
}): JSX.Element {
  return (
    <>
      <PlaySheetSheetModals {...props} />
      <PlaySheetJournalTab
        character={props.character}
        campaignId={props.campaignId}
        isOpen={props.modals.journalOpen}
        onClose={props.modals.closeJournal}
        onOpenNpcDossier={props.modals.openDossier}
      />
      <PlaySheetKnowledgeModals {...props} />
    </>
  )
}
