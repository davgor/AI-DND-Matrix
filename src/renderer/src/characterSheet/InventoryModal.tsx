import type { Character } from '../../../db/repositories/characters'
import type { EquipSlot } from '../../../shared/items/types'
import { InventoryModalDialogs, runEquipFromInventory } from './InventoryModalDialogs'
import { InventoryBackpackList, InventoryEquippedList } from './inventoryModalLists'
import { canFitSlot, InventoryModalHeader, useInventoryModalState } from './inventoryModalParts'
import './inventoryModal.css'

export interface InventoryModalProps {
  character: Character
  isOpen: boolean
  filterSlot: EquipSlot | null
  onClose: () => void
}

export function InventoryModal(props: InventoryModalProps): JSX.Element | null {
  const state = useInventoryModalState(props.character.id, props.isOpen, props.character.currency)
  if (!props.isOpen) {
    return null
  }

  const equipped = state.inventory.items.filter((row) => row.equippedSlot)
  const backpack = state.inventory.items.filter(
    (row) => !row.equippedSlot && (!props.filterSlot || canFitSlot(row, props.filterSlot))
  )

  return (
    <div className="inventory-modal-overlay modal-overlay" role="presentation" onClick={props.onClose}>
      <div className="inventory-modal modal-panel" role="dialog" onClick={(event) => event.stopPropagation()}>
        <InventoryModalHeader filterSlot={props.filterSlot} currency={state.currency} onClose={props.onClose} />
        {state.error ? <p className="inventory-error" role="alert">{state.error}</p> : null}
        <InventoryEquippedList characterId={props.character.id} rows={equipped} inventory={state.inventory} />
        <InventoryBackpackList
          characterId={props.character.id}
          rows={backpack}
          filterSlot={props.filterSlot}
          inventory={state.inventory}
          onEquip={(row, slot) => void runEquipFromInventory(props.character.id, state, row, slot)}
          onDrop={(row) => state.setPendingDrop(row)}
        />
        <InventoryModalDialogs characterId={props.character.id} state={state} />
      </div>
    </div>
  )
}
