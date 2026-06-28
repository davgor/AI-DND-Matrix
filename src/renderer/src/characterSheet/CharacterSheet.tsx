import { useEffect, useState } from 'react'
import type { Character } from '../../../db/repositories/characters'
import './characterSheet.css'

export interface CharacterSheetProps {
  campaignId: string
  isOpen: boolean
  onClose: () => void
}

interface AbilityScores {
  body?: number
  agility?: number
  mind?: number
  presence?: number
}

interface CharacterStats {
  abilityScores?: AbilityScores
  ac?: number
}

export function CharacterSheet(props: CharacterSheetProps): JSX.Element {
  const [character, setCharacter] = useState<Character | null>(null)

  useEffect(() => {
    if (!props.isOpen) return

    let cancelled = false
    window.characters.listByCampaign(props.campaignId).then((characters) => {
      if (cancelled) return
      setCharacter(characters.find((c) => c.kind === 'player') ?? null)
    })

    return () => {
      cancelled = true
    }
  }, [props.isOpen, props.campaignId])

  const panelClassName = props.isOpen
    ? 'character-sheet character-sheet-open'
    : 'character-sheet'

  return (
    <div className={panelClassName}>
      <button
        type="button"
        className="character-sheet-close"
        aria-label="Close character sheet"
        onClick={props.onClose}
      >
        ×
      </button>
      {character ? (
        <CharacterSheetContent character={character} />
      ) : (
        <p className="character-sheet-empty">No character created yet.</p>
      )}
    </div>
  )
}

interface CharacterSheetContentProps {
  character: Character
}

function CharacterSheetContent(props: CharacterSheetContentProps): JSX.Element {
  const { character } = props
  const stats = character.stats as CharacterStats

  return (
    <div className="character-sheet-content">
      <CharacterSheetImages character={character} />
      <h2 className="character-sheet-name">{character.name}</h2>
      <p className="character-sheet-class">
        {character.characterClass} - Level {character.level}
      </p>
      <CharacterSheetVitals character={character} ac={stats.ac} />
      <AbilityScoresList abilityScores={stats.abilityScores} />
      <CharacterSheetInventory inventory={character.inventory} />
    </div>
  )
}

function CharacterSheetImages(props: CharacterSheetContentProps): JSX.Element {
  const { character } = props
  return (
    <div className="character-sheet-images">
      {character.sheetBackgroundPath && (
        <img
          className="character-sheet-background"
          src={`file://${character.sheetBackgroundPath}`}
          alt=""
        />
      )}
      {character.portraitPath && (
        <img
          className="character-sheet-portrait"
          src={`file://${character.portraitPath}`}
          alt={`${character.name} portrait`}
        />
      )}
    </div>
  )
}

interface CharacterSheetVitalsProps {
  character: Character
  ac: number | undefined
}

function CharacterSheetVitals(props: CharacterSheetVitalsProps): JSX.Element {
  const { character, ac } = props
  return (
    <dl className="character-sheet-vitals">
      <div className="character-sheet-stat">
        <dt>HP</dt>
        <dd>{character.hp}</dd>
      </div>
      {ac !== undefined && (
        <div className="character-sheet-stat">
          <dt>AC</dt>
          <dd>{ac}</dd>
        </div>
      )}
      <div className="character-sheet-stat">
        <dt>Currency</dt>
        <dd>{character.currency}</dd>
      </div>
    </dl>
  )
}

interface AbilityScoresListProps {
  abilityScores: AbilityScores | undefined
}

function AbilityScoresList(props: AbilityScoresListProps): JSX.Element | null {
  const { abilityScores } = props
  if (!abilityScores) return null

  const entries: Array<[string, number | undefined]> = [
    ['Body', abilityScores.body],
    ['Agility', abilityScores.agility],
    ['Mind', abilityScores.mind],
    ['Presence', abilityScores.presence]
  ]

  return (
    <dl className="character-sheet-abilities">
      {entries.map(([label, value]) => (
        <div className="character-sheet-stat" key={label}>
          <dt>{label}</dt>
          <dd>{value ?? '-'}</dd>
        </div>
      ))}
    </dl>
  )
}

interface CharacterSheetInventoryProps {
  inventory: unknown[]
}

function CharacterSheetInventory(props: CharacterSheetInventoryProps): JSX.Element {
  const { inventory } = props
  return (
    <div className="character-sheet-inventory">
      <h3>Inventory</h3>
      {inventory.length === 0 ? (
        <p className="character-sheet-empty">No items yet</p>
      ) : (
        <ul>
          {inventory.map((item, i) => (
            <li key={i}>{JSON.stringify(item)}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
