import type { CharacterItemView, EquipSlot } from '../../../shared/items/types'
import { formatEquipFailure } from './acBreakdown'

export async function equipInventoryRow(input: {
  characterId: string
  row: CharacterItemView
  slot: EquipSlot | undefined
  withBusy: <T>(id: string, action: () => Promise<T>) => Promise<T>
  refresh: () => Promise<void>
  onNeedPicker: (row: CharacterItemView, slots: EquipSlot[]) => void
  onError: (message: string) => void
  onDone: () => void
}): Promise<void> {
  const slots = await window.characters.validEquipSlots(input.row.id, input.characterId)
  const targetSlot = input.slot ?? (slots.length === 1 ? slots[0] : undefined)
  if (!targetSlot) {
    input.onNeedPicker(input.row, slots)
    return
  }
  await input.withBusy(input.row.id, async () => {
    const result = await window.characters.equipItem({
      characterId: input.characterId,
      characterItemId: input.row.id,
      slot: targetSlot
    })
    if (!result.ok) {
      input.onError(formatEquipFailure(result.reason))
      return
    }
    await input.refresh()
    input.onDone()
  })
}
