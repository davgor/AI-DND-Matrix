import type { Character } from '../../../db/repositories/characters'
import { ALIGNMENT_LABELS, type Alignment } from '../../../shared/alignment/types'
import { BODY_EQUIP_SLOTS } from '../../../shared/items/types'
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

function PlaySheetQuickLinks(props: {
  onOpenLogBook: () => void
  onOpenQuestLog: () => void
}): JSX.Element {
  return (
    <div className="play-sheet-quick-links">
      <button type="button" className="btn-ghost play-sheet-quick-link" onClick={props.onOpenLogBook}>
        Log book
      </button>
      <button type="button" className="btn-ghost play-sheet-quick-link" onClick={props.onOpenQuestLog}>
        Quest log
      </button>
    </div>
  )
}

export function PlaySheetCombatTab(props: { character: Character }): JSX.Element {
  const stats = props.character.stats as { ac?: number; abilityScores?: AbilityScores; conditions?: string[] }
  const inventory = useCharacterInventory(props.character.id)
  const weapon = inventory.items.find((row) => row.equippedSlot === 'mainHand')

  return (
    <div className="play-sheet-tab-content" role="tabpanel">
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
  onOpenQuestLog: () => void
}): JSX.Element {
  const stats = props.character.stats as { abilityScores?: AbilityScores }
  const alignmentLabel = props.character.alignment
    ? (ALIGNMENT_LABELS[props.character.alignment as Alignment] ?? props.character.alignment)
    : null

  return (
    <div className="play-sheet-tab-content" role="tabpanel">
      <p className="play-sheet-identity-line">
        {props.character.characterClass} — Level {props.character.level}
      </p>
      {alignmentLabel ? <p className="play-sheet-alignment-line">{alignmentLabel}</p> : null}
      {stats.abilityScores ? <AbilityScoreGrid abilityScores={stats.abilityScores} /> : null}
      <CharacterPerksSection stats={props.character.stats} />
      <PlaySheetQuickLinks onOpenLogBook={props.onOpenLogBook} onOpenQuestLog={props.onOpenQuestLog} />
    </div>
  )
}

function slotLabel(slot: string): string {
  if (slot === 'mainHand') {
    return 'Main hand'
  }
  if (slot === 'offHand') {
    return 'Off hand'
  }
  return slot.charAt(0).toUpperCase() + slot.slice(1)
}

export function PlaySheetGearTab(props: {
  character: Character
  onOpenInventory: () => void
}): JSX.Element {
  const inventory = useCharacterInventory(props.character.id)
  const bodySlots = BODY_EQUIP_SLOTS.map((slot) => ({
    slot,
    row: inventory.items.find((item) => item.equippedSlot === slot)
  }))

  return (
    <div className="play-sheet-tab-content" role="tabpanel">
      <dl className="play-sheet-gear-list">
        {bodySlots.map(({ slot, row }) => (
          <div key={slot}>
            <dt>{slotLabel(slot)}</dt>
            <dd>{row ? (row.weaponProfile?.displayName ?? row.item.name) : 'Empty'}</dd>
          </div>
        ))}
      </dl>
      <button type="button" className="play-sheet-action-button" onClick={props.onOpenInventory}>
        Manage inventory
      </button>
    </div>
  )
}

export function PlaySheetJournalTab(props: { onOpenJournal: () => void }): JSX.Element {
  return (
    <div className="play-sheet-tab-content" role="tabpanel">
      <p className="play-sheet-journal-hint">Personal notes and reflections from your journey.</p>
      <button type="button" className="play-sheet-action-button" onClick={props.onOpenJournal}>
        Open journal
      </button>
    </div>
  )
}

export function PlaySheetTabPanel(props: {
  activeTab: PlaySheetTab
  character: Character
  refreshToken: number
  onOpenLogBook: () => void
  onOpenQuestLog: () => void
  onOpenInventory: () => void
  onOpenJournal: () => void
}): JSX.Element {
  if (props.activeTab === 'combat') {
    return <PlaySheetCombatTab character={props.character} />
  }
  if (props.activeTab === 'character') {
    return (
      <PlaySheetCharacterTab
        character={props.character}
        onOpenLogBook={props.onOpenLogBook}
        onOpenQuestLog={props.onOpenQuestLog}
      />
    )
  }
  if (props.activeTab === 'gear') {
    return <PlaySheetGearTab character={props.character} onOpenInventory={props.onOpenInventory} />
  }
  return <PlaySheetJournalTab onOpenJournal={props.onOpenJournal} />
}
