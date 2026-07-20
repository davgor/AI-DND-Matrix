import type { EquipSlot } from '../../../shared/items/types'
import type { useDossierModalTarget } from './useDossierModalTarget'

type ModalFlag = {
  isOpen: boolean
  open: () => void
  close: () => void
}

type InventoryModalState = {
  inventoryOpen: boolean
  inventoryFilterSlot: EquipSlot | null
  openInventory: (slot: EquipSlot | null) => void
  closeInventory: () => void
}

export type PlaySheetModalControls = {
  sheetOpen: boolean
  inventoryOpen: boolean
  logBookOpen: boolean
  journalOpen: boolean
  questLogOpen: boolean
  spellbookOpen: boolean
  askDmOpen: boolean
  dossierNpcId: string | null
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
  openAskDm: () => void
  closeAskDm: () => void
  openDossier: (npcId: string) => void
  closeDossier: () => void
}

export function buildPlaySheetModalControls(flags: {
  sheet: ModalFlag
  inventory: InventoryModalState
  logBook: ModalFlag
  journal: ModalFlag
  questLog: ModalFlag
  spellbook: ModalFlag
  askDm: ModalFlag
  dossier: ReturnType<typeof useDossierModalTarget>
}): PlaySheetModalControls {
  return {
    sheetOpen: flags.sheet.isOpen,
    inventoryOpen: flags.inventory.inventoryOpen,
    logBookOpen: flags.logBook.isOpen,
    journalOpen: flags.journal.isOpen,
    questLogOpen: flags.questLog.isOpen,
    spellbookOpen: flags.spellbook.isOpen,
    askDmOpen: flags.askDm.isOpen,
    dossierNpcId: flags.dossier.dossierNpcId,
    inventoryFilterSlot: flags.inventory.inventoryFilterSlot,
    openSheet: flags.sheet.open,
    closeSheet: flags.sheet.close,
    openInventory: flags.inventory.openInventory,
    closeInventory: flags.inventory.closeInventory,
    openLogBook: flags.logBook.open,
    closeLogBook: flags.logBook.close,
    openJournal: flags.journal.open,
    closeJournal: flags.journal.close,
    openQuestLog: flags.questLog.open,
    closeQuestLog: flags.questLog.close,
    openSpellbook: flags.spellbook.open,
    closeSpellbook: flags.spellbook.close,
    openAskDm: flags.askDm.open,
    closeAskDm: flags.askDm.close,
    openDossier: flags.dossier.openDossier,
    closeDossier: flags.dossier.closeDossier
  }
}
