import type { RaceLore } from '../../../shared/raceSelection/types'
import { LoreField } from './RaceSelectionParts'

const LORE_FIELD_SPECS: Array<{
  key: keyof RaceLore
  label: string
  multiline: boolean
  read: (lore: RaceLore) => string
  write: (value: string) => string | string[]
}> = [
  { key: 'summary', label: 'Summary', multiline: true, read: (lore) => lore.summary, write: (value) => value },
  { key: 'appearance', label: 'Appearance', multiline: true, read: (lore) => lore.appearance, write: (value) => value },
  { key: 'culture', label: 'Culture', multiline: true, read: (lore) => lore.culture, write: (value) => value },
  {
    key: 'roleInThisLand',
    label: 'Role in this land',
    multiline: true,
    read: (lore) => lore.roleInThisLand,
    write: (value) => value
  },
  {
    key: 'hooks',
    label: 'Story hooks',
    multiline: true,
    read: (lore) => lore.hooks.join('\n'),
    write: (value) =>
      value
        .split('\n')
        .map((hook) => hook.trim())
        .filter(Boolean)
  }
]

export function LoreFields(props: {
  lore: RaceLore
  editable: boolean
  onLoreChange: (field: keyof RaceLore, value: string | string[]) => void
}): JSX.Element {
  return (
    <div className="race-selection-lore-fields">
      {LORE_FIELD_SPECS.map((spec) => (
        <LoreField
          key={spec.key}
          label={spec.label}
          value={spec.read(props.lore)}
          editable={props.editable}
          multiline={spec.multiline}
          onChange={(value) => props.onLoreChange(spec.key, spec.write(value))}
        />
      ))}
    </div>
  )
}
