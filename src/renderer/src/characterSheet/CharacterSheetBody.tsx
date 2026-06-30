import { useState } from 'react'
import type { Character } from '../../../db/repositories/characters'
import { CharacterInventorySection } from './CharacterInventorySection'
import { CharacterIdentitySection } from './CharacterIdentitySection'
import { CharacterJournalSection } from './CharacterJournalSection'
import { CharacterLogBookModal } from './CharacterLogBookModal'
import { CharacterPerksSection } from './CharacterPerksSection'
import { CharacterXpSection } from './CharacterXpSection'
import './characterInventory.css'
import './characterIdentity.css'
import './characterJournal.css'
import './characterLogBook.css'

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

export interface CharacterSheetBodyProps {
  character: Character
  compact: boolean
}

export function CharacterSheetBody(props: CharacterSheetBodyProps): JSX.Element {
  const { character } = props
  const stats = character.stats as CharacterStats
  const [logBookOpen, setLogBookOpen] = useState(false)

  return (
    <div className={props.compact ? 'character-sheet-content character-sheet-content-compact' : 'character-sheet-content'}>
      <CharacterSheetImages character={character} compact={props.compact} />
      <h2 className="character-sheet-name">{character.name}</h2>
      <p className="character-sheet-class">
        {character.characterClass} — Level {character.level}
      </p>
      <CharacterXpSection character={character} compact={props.compact} />
      <CharacterSheetVitals character={character} ac={stats.ac} />
      <AbilityScoresList abilityScores={stats.abilityScores} />
      <CharacterPerksSection stats={character.stats} />
      <CharacterIdentitySection character={character} />
      <CharacterJournalSection character={character} />
      <div className="character-log-book-actions">
        <button type="button" onClick={() => setLogBookOpen(true)}>
          Log Book
        </button>
      </div>
      <CharacterInventorySection character={character} />
      <CharacterLogBookModal
        character={character}
        isOpen={logBookOpen}
        onClose={() => setLogBookOpen(false)}
      />
    </div>
  )
}

function CharacterSheetImages(props: CharacterSheetBodyProps): JSX.Element {
  const { character } = props
  if (props.compact) {
    return null
  }
  return (
    <div className="character-sheet-images">
      {character.sheetBackgroundPath ? (
        <img className="character-sheet-background" src={`file://${character.sheetBackgroundPath}`} alt="" />
      ) : null}
      {character.portraitPath ? (
        <img
          className="character-sheet-portrait"
          src={`file://${character.portraitPath}`}
          alt={`${character.name} portrait`}
        />
      ) : null}
    </div>
  )
}

function CharacterSheetVitals(props: { character: Character; ac: number | undefined }): JSX.Element {
  const { character, ac } = props
  return (
    <dl className="character-sheet-vitals">
      <div className="character-sheet-stat">
        <dt>HP</dt>
        <dd>{character.hp}</dd>
      </div>
      {ac !== undefined ? (
        <div className="character-sheet-stat">
          <dt>AC</dt>
          <dd>{ac}</dd>
        </div>
      ) : null}
      <div className="character-sheet-stat">
        <dt>Currency</dt>
        <dd>{character.currency}</dd>
      </div>
    </dl>
  )
}

function AbilityScoresList(props: { abilityScores: AbilityScores | undefined }): JSX.Element | null {
  const { abilityScores } = props
  if (!abilityScores) {
    return null
  }
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
