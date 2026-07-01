import type { EquipSlot } from '../../../shared/items/types'
import { CharacterWeaponProfile } from './CharacterWeaponProfile'
import { formatInventoryRowActions, useInventoryModalState } from './inventoryModalParts'

export function InventoryEquippedList(props: {
  characterId: string
  rows: ReturnType<typeof useInventoryModalState>['inventory']['items']
  inventory: ReturnType<typeof useInventoryModalState>['inventory']
}): JSX.Element {
  return (
    <section className="inventory-equipped-section">
      <h3>Equipped</h3>
      {props.rows.length === 0 ? (
        <p className="character-sheet-empty">Nothing equipped.</p>
      ) : (
        <ul>
          {props.rows.map((row) => (
            <li key={row.id}>
              <strong>{row.item.name}</strong> ({row.equippedSlot})
              {row.weaponProfile ? <CharacterWeaponProfile profile={row.weaponProfile} /> : null}
              <button type="button" onClick={() => void unequipRow(props.characterId, row, props.inventory)}>
                Unequip
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function InventoryBackpackList(props: {
  characterId: string
  rows: ReturnType<typeof useInventoryModalState>['inventory']['items']
  filterSlot: EquipSlot | null
  inventory: ReturnType<typeof useInventoryModalState>['inventory']
  onEquip: (row: ReturnType<typeof useInventoryModalState>['inventory']['items'][number], slot?: EquipSlot) => void
  onDrop: (row: ReturnType<typeof useInventoryModalState>['inventory']['items'][number]) => void
}): JSX.Element {
  return (
    <section className="inventory-backpack-section">
      <h3>Backpack</h3>
      {props.rows.length === 0 ? (
        <p className="character-sheet-empty">No carried items.</p>
      ) : (
        <ul>
          {props.rows.map((row) => (
            <li key={row.id}>
              <div>
                <strong>{row.item.name}</strong>
                <span> x{row.quantity}</span>
                {row.weaponProfile ? <CharacterWeaponProfile profile={row.weaponProfile} /> : null}
              </div>
              <div className="inventory-row-actions">
                {formatInventoryRowActions(row) === 'potion' ? (
                  <button type="button" onClick={() => void consumePotion(props.characterId, row, props.inventory)}>
                    Use
                  </button>
                ) : formatInventoryRowActions(row) === 'equip' ? (
                  <button type="button" onClick={() => props.onEquip(row, props.filterSlot ?? undefined)}>
                    Equip
                  </button>
                ) : null}
                <button type="button" onClick={() => props.onDrop(row)}>
                  Drop
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function InventorySlotPicker(props: {
  row: ReturnType<typeof useInventoryModalState>['inventory']['items'][number]
  slots: EquipSlot[]
  onPick: (slot: EquipSlot) => void
  onCancel: () => void
}): JSX.Element {
  return (
    <div className="inventory-slot-picker" role="dialog" aria-label="Choose equip slot">
      <p>Equip {props.row.item.name} to:</p>
      {props.slots.map((slot) => (
        <button key={slot} type="button" onClick={() => props.onPick(slot)}>
          {slot}
        </button>
      ))}
      <button type="button" onClick={props.onCancel}>
        Cancel
      </button>
    </div>
  )
}

export function InventoryDropConfirm(props: {
  row: ReturnType<typeof useInventoryModalState>['inventory']['items'][number]
  onConfirm: () => void
  onCancel: () => void
}): JSX.Element {
  return (
    <div className="inventory-drop-confirm" role="alertdialog" aria-label="Confirm drop">
      <p>Drop {props.row.item.name}?</p>
      <button type="button" onClick={props.onConfirm}>
        Confirm
      </button>
      <button type="button" onClick={props.onCancel}>
        Cancel
      </button>
    </div>
  )
}

async function unequipRow(
  characterId: string,
  row: ReturnType<typeof useInventoryModalState>['inventory']['items'][number],
  inventory: ReturnType<typeof useInventoryModalState>['inventory']
): Promise<void> {
  await inventory.withBusy(row.id, async () => {
    await window.characters.unequipItem({ characterId, slot: row.equippedSlot as EquipSlot })
    await inventory.refresh()
  })
}

async function consumePotion(
  characterId: string,
  row: ReturnType<typeof useInventoryModalState>['inventory']['items'][number],
  inventory: ReturnType<typeof useInventoryModalState>['inventory']
): Promise<void> {
  await inventory.withBusy(row.id, async () => {
    await window.characters.consumeItem({ characterId, itemId: row.itemId })
    await inventory.refresh()
  })
}

export async function dropInventoryItem(
  characterId: string,
  state: ReturnType<typeof useInventoryModalState>
): Promise<void> {
  if (!state.pendingDrop) {
    return
  }
  await state.inventory.withBusy(state.pendingDrop.id, async () => {
    await window.characters.dropItem({
      characterId,
      characterItemId: state.pendingDrop!.id,
      quantity: 1
    })
    await state.inventory.refresh()
    state.setPendingDrop(null)
  })
}
