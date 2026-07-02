import type { EquipSlot } from '../../../shared/items/types'
import { equipInventoryRow } from './inventoryEquip'
import { InventoryDropConfirm, InventorySlotPicker, dropInventoryItem } from './inventoryModalLists'
import type { useInventoryModalState } from './inventoryModalParts'

export function InventoryModalDialogs(props: {
  characterId: string
  state: ReturnType<typeof useInventoryModalState>
}): JSX.Element | null {
  if (props.state.slotPicker) {
    return (
      <InventorySlotPicker
        row={props.state.slotPicker.row}
        slots={props.state.slotPicker.slots}
        onPick={(slot) => void runEquip(props.characterId, props.state, props.state.slotPicker!.row, slot)}
        onCancel={() => props.state.setSlotPicker(null)}
      />
    )
  }
  if (props.state.pendingDrop) {
    return (
      <InventoryDropConfirm
        row={props.state.pendingDrop}
        onConfirm={() => void dropInventoryItem(props.characterId, props.state)}
        onCancel={() => props.state.setPendingDrop(null)}
      />
    )
  }
  return null
}

function runEquip(
  characterId: string,
  state: ReturnType<typeof useInventoryModalState>,
  row: ReturnType<typeof useInventoryModalState>['inventory']['items'][number],
  slot?: EquipSlot
): Promise<void> {
  return equipInventoryRow({
    characterId,
    row,
    slot,
    withBusy: state.inventory.withBusy,
    refresh: state.inventory.refresh,
    onNeedPicker: (picked, slots) => state.setSlotPicker({ row: picked, slots }),
    onError: state.setError,
    onDone: () => state.setSlotPicker(null)
  })
}

export function runEquipFromInventory(
  characterId: string,
  state: ReturnType<typeof useInventoryModalState>,
  row: ReturnType<typeof useInventoryModalState>['inventory']['items'][number],
  slot?: EquipSlot
): Promise<void> {
  state.setError(null)
  return runEquip(characterId, state, row, slot)
}
