import type { Character } from '../../../db/repositories/characters'
import type { CharacterItemView, EquipSlot } from '../../../shared/items/types'
import { CharacterEquippedSlots } from './CharacterEquippedSlots'
import { CharacterInventoryList } from './CharacterInventoryList'
import { useCharacterInventory } from './useCharacterInventory'
import './characterInventory.css'

export interface CharacterInventorySectionProps {
  character: Character
}

export function CharacterInventorySection(props: CharacterInventorySectionProps): JSX.Element {
  const inventory = useCharacterInventory(props.character.id)

  async function handleEquip(row: CharacterItemView): Promise<void> {
    if (!row.item.equipSlot) {
      return
    }
    await inventory.withBusy(row.id, async () => {
      await window.characters.equipItem({
        characterId: props.character.id,
        characterItemId: row.id,
        slot: row.item.equipSlot as EquipSlot
      })
      await inventory.refresh()
    })
  }

  async function handleUnequip(slot: EquipSlot): Promise<void> {
    await inventory.withBusy(slot, async () => {
      await window.characters.unequipItem({ characterId: props.character.id, slot })
      await inventory.refresh()
    })
  }

  async function handleConsume(row: CharacterItemView): Promise<void> {
    await inventory.withBusy(row.id, async () => {
      await window.characters.consumeItem({ characterId: props.character.id, itemId: row.itemId })
      await inventory.refresh()
    })
  }

  return (
    <div className="character-inventory">
      <h3>Equipment</h3>
      <CharacterEquippedSlots
        items={inventory.items}
        busyId={inventory.busyId}
        onUnequip={(slot) => void handleUnequip(slot)}
      />
      <h3>Inventory</h3>
      <CharacterInventoryList
        items={inventory.items}
        busyId={inventory.busyId}
        onEquip={(row) => void handleEquip(row)}
        onConsume={(row) => void handleConsume(row)}
      />
    </div>
  )
}
