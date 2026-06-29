import type { CharacterItemView, EquipSlot } from '../../../shared/items/types'

const SLOT_LABELS: EquipSlot[] = ['weapon', 'armor', 'trinket']

export interface CharacterEquippedSlotsProps {
  items: CharacterItemView[]
  busyId: string | null
  onUnequip: (slot: EquipSlot) => void
}

export function CharacterEquippedSlots(props: CharacterEquippedSlotsProps): JSX.Element {
  const equippedBySlot = Object.fromEntries(
    SLOT_LABELS.map((slot) => [slot, props.items.find((row) => row.equippedSlot === slot)])
  ) as Record<EquipSlot, CharacterItemView | undefined>

  return (
    <div className="character-inventory-equipped">
      {SLOT_LABELS.map((slot) => {
        const row = equippedBySlot[slot]
        return (
          <div key={slot} className="character-inventory-slot">
            <span className="character-inventory-slot-label">{slot}</span>
            {row ? (
              <>
                <strong>{row.item.name}</strong>
                <button type="button" disabled={props.busyId !== null} onClick={() => props.onUnequip(slot)}>
                  Unequip
                </button>
              </>
            ) : (
              <span className="character-sheet-empty">Empty</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
