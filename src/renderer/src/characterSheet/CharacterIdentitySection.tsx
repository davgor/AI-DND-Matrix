import type { Character } from '../../../db/repositories/characters'
import { IDENTITY_FOUNDATION_SPECS } from '../../../shared/guidedCreation/types'
import { CharacterAlignmentReadout, IdentityFoundationBlocks } from './characterIdentityParts'
import './characterIdentity.css'

export interface CharacterIdentitySectionProps {
  character: Character
}

export function CharacterIdentitySection(props: CharacterIdentitySectionProps): JSX.Element {
  const { character } = props
  const hasIdentity = IDENTITY_FOUNDATION_SPECS.some((spec) => {
    const value =
      spec.key === 'who'
        ? character.identityWho
        : spec.key === 'why'
          ? character.identityWhy
          : spec.key === 'where'
            ? character.identityWhere
            : character.identityWhat
    return Boolean(value)
  })

  if (!hasIdentity && !character.openingScene && !character.alignment) {
    return null
  }

  return (
    <section className="character-identity">
      <h3>Identity</h3>
      <CharacterAlignmentReadout alignment={character.alignment} />
      <IdentityFoundationBlocks character={character} />
      <div className="character-identity-block">
        <h4>Opening scene</h4>
        {character.openingScene ? (
          <p>{character.openingScene}</p>
        ) : (
          <p className="character-sheet-empty">Not set yet.</p>
        )}
      </div>
    </section>
  )
}
