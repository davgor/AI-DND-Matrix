import type { Character } from '../../../db/repositories/characters'
import { CharacterIdentitySection } from '../characterSheet/CharacterIdentitySection'
import { CharacterPerksSection } from '../characterSheet/CharacterPerksSection'
import { useCharacterInventory } from '../characterSheet/useCharacterInventory'

export type PlaySheetTab = 'combat' | 'character' | 'gear' | 'journal'

export const PLAY_SHEET_TAB_LABELS: Record<PlaySheetTab, string> = {
  combat: 'Combat',
  character: 'Character',
  gear: 'Gear',
  journal: 'Journal'
}

interface AbilityScores {
  body?: number
  agility?: number
  mind?: number
  presence?: number
}

export function resolveDefaultPlaySheetTab(combatActive: boolean): PlaySheetTab {
  return combatActive ? 'combat' : 'character'
}

function AbilityScoreGrid(props: { abilityScores: AbilityScores }): JSX.Element {
  return (
    <dl className="play-sheet-ability-scores">
      {Object.entries(props.abilityScores).map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function PlaySheetCombatTab(props: { character: Character }): JSX.Element {
  const stats = props.character.stats as { ac?: number; abilityScores?: AbilityScores; conditions?: string[] }
  const inventory = useCharacterInventory(props.character.id)
  const weapon = inventory.items.find((row) => row.equippedSlot === 'mainHand')

  return (
    <div className="play-sheet-tab-content">
      <dl className="play-sheet-combat-vitals">
        <div>
          <dt>HP</dt>
          <dd>{props.character.hp}</dd>
        </div>
        {stats.ac !== undefined ? (
          <div>
            <dt>AC</dt>
            <dd>{stats.ac}</dd>
          </div>
        ) : null}
      </dl>
      {stats.conditions && stats.conditions.length > 0 ? (
        <ul className="play-sheet-conditions">
          {stats.conditions.map((condition) => (
            <li key={condition}>{condition}</li>
          ))}
        </ul>
      ) : null}
      {weapon ? (
        <p className="play-sheet-equipped-weapon">
          <strong>Weapon:</strong> {weapon.weaponProfile?.displayName ?? weapon.item.name}
        </p>
      ) : (
        <p className="character-sheet-empty">No weapon equipped.</p>
      )}
      {stats.abilityScores ? <AbilityScoreGrid abilityScores={stats.abilityScores} /> : null}
    </div>
  )
}

export function PlaySheetCharacterTab(props: {
  character: Character
  onOpenLogBook: () => void
  onOpenSheet: () => void
}): JSX.Element {
  const stats = props.character.stats as { abilityScores?: AbilityScores }
  return (
    <div className="play-sheet-tab-content">
      <p className="play-sheet-identity-line">
        {props.character.characterClass} — Level {props.character.level}
      </p>
      {stats.abilityScores ? <AbilityScoreGrid abilityScores={stats.abilityScores} /> : null}
      <CharacterPerksSection stats={props.character.stats} />
      <CharacterIdentitySection character={props.character} />
      <button type="button" className="play-sheet-log-book-button" onClick={props.onOpenSheet}>
        Character Sheet
      </button>
      <button type="button" className="play-sheet-log-book-button" onClick={props.onOpenLogBook}>
        Log Book
      </button>
    </div>
  )
}

export function PlaySheetGearTab(props: { character: Character; onOpenSheet: () => void }): JSX.Element {
  return (
    <div className="play-sheet-tab-content">
      <p className="character-sheet-empty">Gear and inventory open in the character sheet overlay.</p>
      <button type="button" className="play-sheet-log-book-button" onClick={props.onOpenSheet}>
        Open character sheet
      </button>
    </div>
  )
}

export function PlaySheetJournalTab(_props: { character: Character }): JSX.Element {
  return (
    <div className="play-sheet-tab-content">
      <p className="character-sheet-empty">Journal opens from the character sheet overlay.</p>
    </div>
  )
}

export function PlaySheetTabPanel(props: {
  activeTab: PlaySheetTab
  character: Character
  onOpenLogBook: () => void
  onOpenSheet: () => void
}): JSX.Element {
  if (props.activeTab === 'combat') {
    return <PlaySheetCombatTab character={props.character} />
  }
  if (props.activeTab === 'character') {
    return (
      <PlaySheetCharacterTab
        character={props.character}
        onOpenLogBook={props.onOpenLogBook}
        onOpenSheet={props.onOpenSheet}
      />
    )
  }
  if (props.activeTab === 'gear') {
    return <PlaySheetGearTab character={props.character} onOpenSheet={props.onOpenSheet} />
  }
  return <PlaySheetJournalTab character={props.character} />
}
