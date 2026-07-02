import type { Character } from '../../../db/repositories/characters'
import type { EquipSlot } from '../../../shared/items/types'
import { AcBreakdownPanel } from './AcBreakdownPanel'
import { EquipmentSlotPanel } from './EquipmentSlotPanel'
import { buildAcBreakdown } from './acBreakdown'
import { useCharacterInventory } from './useCharacterInventory'

export function CharacterSheetOverlayBody(props: {
  character: Character
  onOpenInventory: (slot?: EquipSlot) => void
}): JSX.Element {
  const inventory = useCharacterInventory(props.character.id)
  const agility = (props.character.stats as { abilityScores?: { agility?: number } }).abilityScores?.agility ?? 10
  const ac = buildAcBreakdown(agility, inventory.items)

  return (
    <div className="character-sheet-overlay-body">
      <section className="character-sheet-overlay-vitals">
        <div>
          <span className="character-sheet-stat-label">HP</span>
          <strong>{props.character.hp}</strong>
        </div>
        <div>
          <span className="character-sheet-stat-label">AC</span>
          <strong>{ac.total}</strong>
        </div>
      </section>
      <EquipmentSlotPanel
        characterId={props.character.id}
        items={inventory.items}
        agilityScore={agility}
        busyId={inventory.busyId}
        onRefresh={() => void inventory.refresh()}
        onOpenInventoryForSlot={(slot) => props.onOpenInventory(slot)}
      />
      <AcBreakdownPanel breakdown={ac} />
      <div className="character-sheet-overlay-actions">
        <button type="button" onClick={() => props.onOpenInventory()}>
          Inventory
        </button>
      </div>
    </div>
  )
}
