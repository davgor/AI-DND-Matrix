import { useState } from 'react'
import type { EquipSlot } from '../../../shared/items/types'

function useModalFlag(): {
  isOpen: boolean
  open: () => void
  close: () => void
} {
  const [isOpen, setIsOpen] = useState(false)
  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false)
  }
}

function useInventoryModalState(): {
  inventoryOpen: boolean
  inventoryFilterSlot: EquipSlot | null
  openInventory: (slot: EquipSlot | null) => void
  closeInventory: () => void
} {
  const inventory = useModalFlag()
  const [inventoryFilterSlot, setInventoryFilterSlot] = useState<EquipSlot | null>(null)
  return {
    inventoryOpen: inventory.isOpen,
    inventoryFilterSlot,
    openInventory: (slot) => {
      setInventoryFilterSlot(slot)
      inventory.open()
    },
    closeInventory: () => {
      inventory.close()
      setInventoryFilterSlot(null)
    }
  }
}

export function usePlaySheetModals(): {
  sheetOpen: boolean
  inventoryOpen: boolean
  logBookOpen: boolean
  journalOpen: boolean
  questLogOpen: boolean
  spellbookOpen: boolean
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
  openSpellbook: () => void
  closeSpellbook: () => void
} {
  const sheet = useModalFlag()
  const inventory = useInventoryModalState()
  const logBook = useModalFlag()
  const journal = useModalFlag()
  const questLog = useModalFlag()
  const spellbook = useModalFlag()

  return {
    sheetOpen: sheet.isOpen,
    inventoryOpen: inventory.inventoryOpen,
    logBookOpen: logBook.isOpen,
    journalOpen: journal.isOpen,
    questLogOpen: questLog.isOpen,
    spellbookOpen: spellbook.isOpen,
    inventoryFilterSlot: inventory.inventoryFilterSlot,
    openSheet: sheet.open,
    closeSheet: sheet.close,
    openInventory: inventory.openInventory,
    closeInventory: inventory.closeInventory,
    openLogBook: logBook.open,
    closeLogBook: logBook.close,
    openJournal: journal.open,
    closeJournal: journal.close,
    openQuestLog: questLog.open,
    closeQuestLog: questLog.close,
    openSpellbook: spellbook.open,
    closeSpellbook: spellbook.close
  }
}
