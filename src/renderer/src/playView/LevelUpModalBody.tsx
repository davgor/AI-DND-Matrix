import type { PendingLevelUpResponse } from '../../../main/progressionIpc'
import type { PerkProposal } from '../../../shared/progression/types'
import './levelUpModal.css'

function PerkCard(props: {
  perk: PerkProposal
  selected: boolean
  onSelect: () => void
}): JSX.Element {
  return (
    <button
      type="button"
      className={props.selected ? 'level-up-card level-up-card-selected' : 'level-up-card'}
      role="radio"
      aria-checked={props.selected}
      onClick={props.onSelect}
    >
      <span className="level-up-card-badge">
        {String(props.perk.category ?? '').replace(/_/g, ' ')}
      </span>
      <strong>{props.perk.name}</strong>
      <p>{props.perk.description}</p>
    </button>
  )
}

export function LevelUpModalBody(props: {
  pending: PendingLevelUpResponse
  selectedId: string | null
  submitting: boolean
  onSelect: (id: string) => void
  onConfirm: () => void
}): JSX.Element {
  const perks = Array.isArray(props.pending.perks) ? props.pending.perks : []
  return (
    <div className="level-up-modal">
      <h2 id="level-up-title">Level {props.pending.targetLevel}</h2>
      <p className="level-up-narration">{props.pending.narrationText}</p>
      <p className="level-up-prompt">Choose one perk to continue:</p>
      <div className="level-up-options" role="radiogroup" aria-label="Perk choices">
        {perks.map((perk) => (
          <PerkCard
            key={perk.id}
            perk={perk}
            selected={props.selectedId === perk.id}
            onSelect={() => props.onSelect(perk.id)}
          />
        ))}
      </div>
      <button
        type="button"
        className="level-up-confirm"
        disabled={!props.selectedId || props.submitting}
        onClick={props.onConfirm}
      >
        Confirm perk
      </button>
    </div>
  )
}
