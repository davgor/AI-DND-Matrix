import type { CharacterItemView, EquipSlot } from '../../../shared/items/types'
import { CharacterWeaponProfile } from './CharacterWeaponProfile'
import { SLOT_LABELS } from './acBreakdown'

function isTwoHand(row: CharacterItemView): boolean {
  return row.item.mechanicalProperties.kind === 'weapon' && row.item.mechanicalProperties.handedness === 'twoHand'
}

function EquipmentSlotCell(props: {
  slot: EquipSlot
  row: CharacterItemView | undefined
  twoHandOccupiesOff: boolean
  busyId: string | null
  onUnequip: (slot: EquipSlot) => void
  onOpenInventoryForSlot: (slot: EquipSlot) => void
}): JSX.Element {
  const { row, twoHandOccupiesOff } = props
  return (
    <div className={row || twoHandOccupiesOff ? 'equipment-slot-filled' : 'equipment-slot-empty'}>
      <span className="equipment-slot-label">{SLOT_LABELS[props.slot]}</span>
      {twoHandOccupiesOff ? (
        <span className="character-sheet-empty">(two-handed)</span>
      ) : row ? (
        <>
          <strong>{row.weaponProfile?.displayName ?? row.item.name}</strong>
          {row.weaponProfile ? <CharacterWeaponProfile profile={row.weaponProfile} /> : null}
          <button type="button" disabled={props.busyId !== null} onClick={() => props.onUnequip(props.slot)}>
            Unequip
          </button>
        </>
      ) : (
        <button type="button" onClick={() => props.onOpenInventoryForSlot(props.slot)}>
          Equip…
        </button>
      )}
    </div>
  )
}

export function EquipmentSlotPanel(props: {
  characterId: string
  items: CharacterItemView[]
  agilityScore: number
  busyId: string | null
  onRefresh: () => void
  onOpenInventoryForSlot: (slot: EquipSlot) => void
}): JSX.Element {
  const equippedBySlot = Object.fromEntries(
    (Object.keys(SLOT_LABELS) as EquipSlot[]).map((slot) => [
      slot,
      props.items.find((row) => row.equippedSlot === slot)
    ])
  ) as Record<EquipSlot, CharacterItemView | undefined>
  const mainWeapon = equippedBySlot.mainHand
  const offWeapon = equippedBySlot.offHand

  async function unequip(slot: EquipSlot): Promise<void> {
    await window.characters.unequipItem({ characterId: props.characterId, slot })
    props.onRefresh()
  }

  return (
    <div className="equipment-slot-panel">
      <div className="equipment-slot-grid">
        {(Object.keys(SLOT_LABELS) as EquipSlot[]).map((slot) => (
          <EquipmentSlotCell
            key={slot}
            slot={slot}
            row={equippedBySlot[slot]}
            twoHandOccupiesOff={slot === 'offHand' && Boolean(equippedBySlot.mainHand && isTwoHand(equippedBySlot.mainHand))}
            busyId={props.busyId}
            onUnequip={(target) => void unequip(target)}
            onOpenInventoryForSlot={props.onOpenInventoryForSlot}
          />
        ))}
      </div>
      {mainWeapon?.weaponProfile ? (
        <p className="equipment-attack-summary">
          <strong>Attack:</strong> {mainWeapon.weaponProfile.displayName ?? mainWeapon.item.name}
          {offWeapon?.item.mechanicalProperties.kind === 'weapon' ? ' (dual wield — off-hand not rolled)' : ''}
        </p>
      ) : (
        <p className="character-sheet-empty">No main-hand weapon equipped.</p>
      )}
    </div>
  )
}
