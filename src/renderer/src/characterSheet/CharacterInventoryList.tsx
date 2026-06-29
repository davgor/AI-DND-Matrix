import type { CharacterItemView } from '../../../shared/items/types'

export interface CharacterInventoryListProps {
  items: CharacterItemView[]
  busyId: string | null
  onEquip: (row: CharacterItemView) => void
  onConsume: (row: CharacterItemView) => void
}

export function CharacterInventoryList(props: CharacterInventoryListProps): JSX.Element {
  const backpack = props.items.filter((row) => !row.equippedSlot)
  if (backpack.length === 0) {
    return <p className="character-sheet-empty">No carried items yet</p>
  }

  return (
    <ul className="character-inventory-list">
      {backpack.map((row) => (
        <li key={row.id}>
          <div>
            <strong>{row.item.name}</strong>
            <span className="character-inventory-meta">
              {row.item.itemType} · x{row.quantity}
            </span>
            <p>{row.item.description}</p>
          </div>
          <div className="character-inventory-actions">
            {row.item.itemType === 'potion' ? (
              <button type="button" disabled={props.busyId !== null} onClick={() => props.onConsume(row)}>
                Use
              </button>
            ) : row.item.equipSlot ? (
              <button type="button" disabled={props.busyId !== null} onClick={() => props.onEquip(row)}>
                Equip
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}
