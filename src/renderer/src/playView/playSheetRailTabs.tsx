import type { Character } from '../../../db/repositories/characters'
import { ALIGNMENT_LABELS, type Alignment } from '../../../shared/alignment/types'
import {
  ACCESSORY_EQUIP_SLOTS,
  BODY_EQUIP_SLOTS,
  type CharacterItemView,
  type EquipSlot
} from '../../../shared/items/types'
import { SLOT_LABELS } from '../characterSheet/acBreakdown'
import { CharacterPerksSection } from '../characterSheet/CharacterPerksSection'
import { useCharacterInventory } from '../characterSheet/useCharacterInventory'
import { equippedItemLabel } from './playSheetEquipLabels'
import { PlaySheetPortraitSlot } from './PlaySheetPortraitSlot'

export type PlaySheetTab = 'character' | 'inventory' | 'journal'

export const PLAY_SHEET_TAB_LABELS: Record<PlaySheetTab, string> = {
  character: 'Character',
  inventory: 'Inventory',
  journal: 'Journal'
}

interface AbilityScores {
  body?: number
  agility?: number
  mind?: number
  presence?: number
}

interface CharacterTabStats {
  abilityScores?: AbilityScores
  ac?: number
  maxHp?: number
  conditions?: string[]
}

export function resolveDefaultPlaySheetTab(): PlaySheetTab {
  return 'character'
}

function formatHpLine(character: Character, maxHp: number | undefined): string {
  if (maxHp !== undefined && maxHp > 0) {
    return `${character.hp}/${maxHp}`
  }
  return String(character.hp)
}

function PlaySheetSectionHeading(props: { children: string }): JSX.Element {
  return <h3 className="play-sheet-section-heading">{props.children}</h3>
}

function PlaySheetSectionDivider(): JSX.Element {
  return <hr className="play-sheet-section-divider" aria-hidden="true" />
}

function PlaySheetEquipList(props: {
  slots: readonly EquipSlot[]
  items: CharacterItemView[]
  mainHand?: CharacterItemView
}): JSX.Element {
  return (
    <dl className="play-sheet-gear-list">
      {props.slots.map((slot) => {
        const row = props.items.find((item) => item.equippedSlot === slot)
        return (
          <div key={slot}>
            <dt>{SLOT_LABELS[slot]}</dt>
            <dd>{equippedItemLabel(slot, row, props.mainHand)}</dd>
          </div>
        )
      })}
    </dl>
  )
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

function PlaySheetVitals(props: { character: Character; stats: CharacterTabStats }): JSX.Element {
  return (
    <dl className="play-sheet-combat-vitals">
      <div>
        <dt>HP</dt>
        <dd>{formatHpLine(props.character, props.stats.maxHp)}</dd>
      </div>
      {props.stats.ac !== undefined ? (
        <div>
          <dt>AC</dt>
          <dd>{props.stats.ac}</dd>
        </div>
      ) : null}
    </dl>
  )
}

export function PlaySheetCharacterTab(props: {
  character: Character
  onCharacterUpdated: (character: Character) => void
}): JSX.Element {
  const stats = (props.character.stats ?? {}) as CharacterTabStats
  const alignmentLabel = props.character.alignment
    ? (ALIGNMENT_LABELS[props.character.alignment as Alignment] ?? props.character.alignment)
    : null

  return (
    <div className="play-sheet-tab-content" role="tabpanel">
      <PlaySheetPortraitSlot
        character={props.character}
        campaignId={props.character.campaignId}
        onCharacterUpdated={props.onCharacterUpdated}
      />
      <h2 className="play-sheet-character-name">{props.character.name}</h2>
      <p className="play-sheet-identity-line">
        {props.character.characterClass} — Level {props.character.level}
      </p>
      {alignmentLabel ? <p className="play-sheet-alignment-line">{alignmentLabel}</p> : null}
      <PlaySheetVitals character={props.character} stats={stats} />
      {stats.conditions && stats.conditions.length > 0 ? (
        <ul className="play-sheet-conditions">
          {stats.conditions.map((condition) => (
            <li key={condition}>{condition}</li>
          ))}
        </ul>
      ) : null}
      <PlaySheetSectionDivider />
      {stats.abilityScores ? <AbilityScoreGrid abilityScores={stats.abilityScores} /> : null}
      <CharacterPerksSection stats={stats as Record<string, unknown>} />
    </div>
  )
}

export function PlaySheetInventoryTab(props: {
  character: Character
  onOpenInventory: () => void
}): JSX.Element {
  const inventory = useCharacterInventory(props.character.id)
  const mainHand = inventory.items.find((row) => row.equippedSlot === 'mainHand')

  return (
    <div className="play-sheet-tab-content" role="tabpanel">
      <p className="play-sheet-currency-line">{props.character.currency} gp</p>
      <section className="play-sheet-section">
        <PlaySheetSectionHeading>Equipment</PlaySheetSectionHeading>
        <PlaySheetEquipList slots={BODY_EQUIP_SLOTS} items={inventory.items} mainHand={mainHand} />
      </section>
      <PlaySheetSectionDivider />
      <section className="play-sheet-section">
        <PlaySheetSectionHeading>Accessories</PlaySheetSectionHeading>
        <p className="play-sheet-section-hint">Rings, boots, belts, cloaks, and other worn trinkets.</p>
        <PlaySheetEquipList slots={ACCESSORY_EQUIP_SLOTS} items={inventory.items} />
      </section>
      <button type="button" className="play-sheet-action-button" onClick={props.onOpenInventory}>
        Manage inventory
      </button>
    </div>
  )
}

export function PlaySheetJournalTab(props: {
  onOpenJournal: () => void
  onOpenQuestLog: () => void
  onOpenSpellbook: () => void
  onOpenAskDm: () => void
  onOpenLogBook: () => void
}): JSX.Element {
  return (
    <div className="play-sheet-tab-content" role="tabpanel">
      <p className="play-sheet-journal-hint">Personal notes, world knowledge, and journey records.</p>
      <div className="play-sheet-journal-actions">
        <button type="button" className="play-sheet-action-button" onClick={props.onOpenJournal}>
          Open journal
        </button>
        <button type="button" className="play-sheet-action-button" onClick={props.onOpenLogBook}>
          Open knowledge base
        </button>
        <button type="button" className="play-sheet-action-button" onClick={props.onOpenQuestLog}>
          Open quest log
        </button>
        <button type="button" className="play-sheet-action-button" onClick={props.onOpenSpellbook}>
          Open spellbook
        </button>
        <button type="button" className="play-sheet-action-button" onClick={props.onOpenAskDm}>
          Ask the DM
        </button>
      </div>
    </div>
  )
}

export function PlaySheetTabPanel(props: {
  activeTab: PlaySheetTab
  character: Character
  onCharacterUpdated: (character: Character) => void
  refreshToken: number
  onOpenLogBook: () => void
  onOpenQuestLog: () => void
  onOpenInventory: () => void
  onOpenJournal: () => void
  onOpenSpellbook: () => void
  onOpenAskDm: () => void
}): JSX.Element {
  if (props.activeTab === 'inventory') {
    return <PlaySheetInventoryTab character={props.character} onOpenInventory={props.onOpenInventory} />
  }
  if (props.activeTab === 'journal') {
    return (
      <PlaySheetJournalTab
        onOpenJournal={props.onOpenJournal}
        onOpenQuestLog={props.onOpenQuestLog}
        onOpenSpellbook={props.onOpenSpellbook}
        onOpenAskDm={props.onOpenAskDm}
        onOpenLogBook={props.onOpenLogBook}
      />
    )
  }
  return (
    <PlaySheetCharacterTab
      character={props.character}
      onCharacterUpdated={props.onCharacterUpdated}
    />
  )
}
