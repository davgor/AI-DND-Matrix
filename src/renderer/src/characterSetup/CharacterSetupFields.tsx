import { ALIGNMENTS, ALIGNMENT_LABELS } from '../../../shared/alignment/types'
import type { Alignment } from '../../../shared/alignment/types'
import type { Archetype } from '../../../engine/hp'
import type { CharacterSetupController } from './useCharacterSetup'

export function CharacterSetupAlignmentField(props: {
  alignment: Alignment | ''
  setAlignment: (value: Alignment | '') => void
}): JSX.Element {
  return (
    <label className="character-setup-field">
      <span>Alignment</span>
      <select
        value={props.alignment}
        onChange={(event) => props.setAlignment(event.target.value as Alignment | '')}
      >
        <option value="">--</option>
        {ALIGNMENTS.map((alignment) => (
          <option key={alignment} value={alignment}>
            {ALIGNMENT_LABELS[alignment]}
          </option>
        ))}
      </select>
    </label>
  )
}

export function CharacterSetupCoreFields(props: {
  setup: Pick<
    CharacterSetupController,
    'name' | 'setName' | 'archetype' | 'setArchetype' | 'alignment' | 'setAlignment'
  >
  archetypes: Archetype[]
}): JSX.Element {
  const { setup } = props
  return (
    <>
      <label className="character-setup-field">
        <span>Character name</span>
        <input
          type="text"
          value={setup.name}
          placeholder="e.g. Tomas Reed"
          autoComplete="off"
          onChange={(event) => setup.setName(event.target.value)}
        />
      </label>

      <label className="character-setup-field">
        <span>Archetype</span>
        <select
          value={setup.archetype}
          onChange={(event) => setup.setArchetype(event.target.value as Archetype)}
        >
          <option value="">--</option>
          {props.archetypes.map((archetype) => (
            <option key={archetype} value={archetype}>
              {archetype}
            </option>
          ))}
        </select>
      </label>

      <CharacterSetupAlignmentField alignment={setup.alignment} setAlignment={setup.setAlignment} />
    </>
  )
}
