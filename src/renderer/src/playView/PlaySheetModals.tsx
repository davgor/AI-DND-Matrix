import { useState } from 'react'
import type { EquipSlot } from '../../../shared/items/types'
import type { Character } from '../../../db/repositories/characters'
import { CharacterLogBookModal } from '../characterSheet/CharacterLogBookModal'
import { QuestLogModal } from '../characterSheet/QuestLogModal'
import { CharacterSheetOverlay } from '../characterSheet/CharacterSheetOverlay'
import { InventoryModal } from '../characterSheet/InventoryModal'
import { PlaySheetJournalTab } from './playSheetJournalOverlay'

export function usePlaySheetModals(): {
  sheetOpen: boolean
  inventoryOpen: boolean
  logBookOpen: boolean
  journalOpen: boolean
  questLogOpen: boolean
  inventoryFilterSlot: EquipSlot | null
  openSheet: () => void
  closeSheet: () => void
  openInventory: (slot: EquipSlot | null) => void
  closeInventory: () => void
  openLogBook: () => void
  closeLogBook: () => void
  openJournal: () => void
  closeJournal: () => void
  openQuestLog: () => void
  closeQuestLog: () => void
} {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [logBookOpen, setLogBookOpen] = useState(false)
  const [journalOpen, setJournalOpen] = useState(false)
  const [questLogOpen, setQuestLogOpen] = useState(false)
  const [inventoryFilterSlot, setInventoryFilterSlot] = useState<EquipSlot | null>(null)

  return {
    sheetOpen,
    inventoryOpen,
    logBookOpen,
    journalOpen,
    questLogOpen,
    inventoryFilterSlot,
    openSheet: () => setSheetOpen(true),
    closeSheet: () => setSheetOpen(false),
    openInventory: (slot) => {
      setInventoryFilterSlot(slot)
      setInventoryOpen(true)
    },
    closeInventory: () => {
      setInventoryOpen(false)
      setInventoryFilterSlot(null)
    },
    openLogBook: () => setLogBookOpen(true),
    closeLogBook: () => setLogBookOpen(false),
    openJournal: () => setJournalOpen(true),
    closeJournal: () => setJournalOpen(false),
    openQuestLog: () => setQuestLogOpen(true),
    closeQuestLog: () => setQuestLogOpen(false)
  }
}

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
        onOpenLogBook={props.modals.openLogBook}
        onOpenJournal={props.modals.openJournal}
        onOpenQuestLog={props.modals.openQuestLog}
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
    </>
  )
}
