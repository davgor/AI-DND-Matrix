import type { Character } from '../../../db/repositories/characters'
import { ALIGNMENT_LABELS } from '../../../shared/alignment/types'
import { IDENTITY_FOUNDATION_SPECS } from '../../../shared/guidedCreation/types'

export function CharacterAlignmentReadout(props: { alignment: Character['alignment'] }): JSX.Element | null {
  if (!props.alignment) {
    return null
  }
  return (
    <div className="character-identity-block">
      <h4>Alignment</h4>
      <p>{ALIGNMENT_LABELS[props.alignment]}</p>
    </div>
  )
}

export function IdentityFoundationBlocks(props: { character: Character }): JSX.Element {
  const { character } = props
  return (
    <>
      {IDENTITY_FOUNDATION_SPECS.map((spec) => {
        const summary =
          spec.key === 'who'
            ? character.identityWho
            : spec.key === 'why'
              ? character.identityWhy
              : spec.key === 'where'
                ? character.identityWhere
                : character.identityWhat
        return (
          <div key={spec.key} className="character-identity-block">
            <h4>{spec.label}</h4>
            {summary ? <p>{summary}</p> : <p className="character-sheet-empty">Not recorded yet.</p>}
          </div>
        )
      })}
    </>
  )
}
