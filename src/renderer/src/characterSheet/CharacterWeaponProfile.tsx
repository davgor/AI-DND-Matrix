import type { DamageComponent, WeaponDamageProfile } from '../../../shared/weaponModifications/types'
import './characterWeaponProfile.css'

export interface CharacterWeaponProfileProps {
  profile: WeaponDamageProfile
}

export function CharacterWeaponProfile(props: CharacterWeaponProfileProps): JSX.Element {
  const { profile } = props
  return (
    <div className="character-weapon-profile">
      <ul className="character-weapon-profile-lines">
        {profile.components.map((component, index) => (
          <li key={`${component.damageType}-${index}`}>
            {formatComponentLine(component, index > 0)}
          </li>
        ))}
      </ul>
      {profile.description && profile.displayName ? (
        <p className="character-weapon-profile-flavor">{profile.description}</p>
      ) : null}
    </div>
  )
}

function formatComponentLine(component: DamageComponent, enchanted: boolean): string {
  const roll = `${component.damageRoll.diceCount}d${component.damageRoll.diceSize}`
  const suffix = enchanted ? ' (enchanted)' : ''
  return `${roll} ${component.damageType}${suffix}`
}
