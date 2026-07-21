import { useState } from 'react'
import type { EquipSlot } from '../../../shared/items/types'
import { buildPlaySheetModalControls, type PlaySheetModalControls } from './playSheetModalControls'
import { useDossierModalTarget } from './useDossierModalTarget'

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

function usePlaySheetModalFlags(): Parameters<typeof buildPlaySheetModalControls>[0] {
  return {
    sheet: useModalFlag(),
    inventory: useInventoryModalState(),
    logBook: useModalFlag(),
    journal: useModalFlag(),
    questLog: useModalFlag(),
    spellbook: useModalFlag(),
    askDm: useModalFlag(),
    dossier: useDossierModalTarget()
  }
}

export function usePlaySheetModals(): PlaySheetModalControls {
  return buildPlaySheetModalControls(usePlaySheetModalFlags())
}
