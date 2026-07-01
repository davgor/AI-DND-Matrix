import { useEffect, useState } from 'react'
import type { CharacterItemView, EquipSlot } from '../../../shared/items/types'
import { CurrencyChip } from './CurrencyChip'
import { useCharacterInventory } from './useCharacterInventory'

export function useInventoryModalState(characterId: string, isOpen: boolean, characterCurrency: number) {
  const inventory = useCharacterInventory(characterId)
  const [error, setError] = useState<string | null>(null)
  const [pendingDrop, setPendingDrop] = useState<CharacterItemView | null>(null)
  const [slotPicker, setSlotPicker] = useState<{ row: CharacterItemView; slots: EquipSlot[] } | null>(null)
  const [currency, setCurrency] = useState(characterCurrency)

  useEffect(() => {
    setCurrency(characterCurrency)
  }, [characterCurrency, isOpen])

  return { inventory, error, setError, pendingDrop, setPendingDrop, slotPicker, setSlotPicker, currency }
}

export function InventoryModalHeader(props: {
  filterSlot: EquipSlot | null
  currency: number
  onClose: () => void
}): JSX.Element {
  return (
    <header className="inventory-modal-header">
      <div>
        <h2 id="inventory-modal-title">Inventory</h2>
        {props.filterSlot ? <p className="inventory-filter-hint">Filtered for {props.filterSlot}</p> : null}
      </div>
      <div className="inventory-modal-header-actions">
        <CurrencyChip currency={props.currency} />
        <button type="button" aria-label="Close inventory" onClick={props.onClose}>
          ×
        </button>
      </div>
    </header>
  )
}

export function canFitSlot(row: CharacterItemView, slot: EquipSlot): boolean {
  if (row.item.equipSlot === slot) {
    return true
  }
  if (row.item.mechanicalProperties.kind === 'weapon' && row.item.mechanicalProperties.handedness === 'oneHand') {
    return slot === 'mainHand' || slot === 'offHand'
  }
  return row.item.mechanicalProperties.kind === 'shield' && slot === 'offHand'
}

export function formatInventoryRowActions(row: CharacterItemView): 'potion' | 'equip' | 'none' {
  if (row.item.itemType === 'potion') {
    return 'potion'
  }
  if (row.item.equipSlot || row.item.mechanicalProperties.kind === 'weapon' || row.item.mechanicalProperties.kind === 'shield') {
    return 'equip'
  }
  return 'none'
}
