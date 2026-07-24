import './equipmentSelection.css'

import type { ReactNode } from 'react'
import { formatSpellTooltip } from '../../../engine/spellDisplay'
import type { StartingLoadoutOffer, StartingLoadoutSpellOption } from '../../../shared/startingLoadout/types'
import {
  canConfirmEquipmentSelection,
  offHandOptionDisabled,
  offHandOptionsVisible,
  resolveOffHandAfterWeaponChange,
  toggleSpellSelection,
  type EquipmentSelectionState
} from './equipmentSelectionLogic'
import { OnboardingBackButton } from '../onboarding/OnboardingBackButton'
import { ProceedButton } from '../onboarding/ProceedButton'

function OptionGroup(props: { title: string; hint?: string; children: ReactNode }): JSX.Element {
  return (
    <section className="equipment-selection-group">
      <h2>{props.title}</h2>
      {props.hint ? <p className="equipment-selection-hint">{props.hint}</p> : null}
      <div className="equipment-selection-options">{props.children}</div>
    </section>
  )
}

function PickButton(props: {
  label: string
  description?: string
  selected: boolean
  disabled?: boolean
  tooltip?: string[]
  tooltipId?: string
  onSelect: () => void
}): JSX.Element {
  const tooltipId = props.tooltipId ?? props.label
  const button = (
    <button
      type="button"
      className={`equipment-selection-option${props.selected ? ' is-selected' : ''}`}
      disabled={props.disabled}
      aria-pressed={props.selected}
      aria-describedby={props.tooltip?.length ? tooltipId : undefined}
      onClick={props.onSelect}
    >
      <span className="equipment-selection-option-label">{props.label}</span>
      {props.description ? (
        <span className="equipment-selection-option-desc">{props.description}</span>
      ) : null}
    </button>
  )

  if (!props.tooltip?.length) {
    return button
  }

  return (
    <span className="equipment-selection-tooltip-wrap">
      {button}
      <span className="equipment-selection-tooltip" id={tooltipId} role="tooltip">
        {props.tooltip.map((line, index) => (
          <span key={`${tooltipId}-${index}`} className="equipment-selection-tooltip-line">
            {line}
          </span>
        ))}
      </span>
    </span>
  )
}

function spellCardDescription(spell: StartingLoadoutSpellOption): string {
  return `${spell.effectType} · ${spell.range} · ${spell.cost} turn${spell.cost === 1 ? '' : 's'}`
}

function WeaponGroup(props: {
  offer: StartingLoadoutOffer
  state: EquipmentSelectionState
  setState: (next: EquipmentSelectionState) => void
}): JSX.Element {
  return (
    <OptionGroup title="Weapon (pick 1)">
      {props.offer.weapons.map((weapon) => (
        <PickButton
          key={weapon.name}
          label={weapon.name}
          description={weapon.description}
          selected={props.state.weaponName === weapon.name}
          onSelect={() =>
            props.setState({
              ...props.state,
              weaponName: weapon.name,
              offHandChoice: resolveOffHandAfterWeaponChange(
                props.offer,
                weapon.name,
                props.state.offHandChoice
              )
            })
          }
        />
      ))}
    </OptionGroup>
  )
}

function ArmorGroup(props: {
  offer: StartingLoadoutOffer
  state: EquipmentSelectionState
  setState: (next: EquipmentSelectionState) => void
}): JSX.Element {
  return (
    <OptionGroup title="Armor (pick 1)">
      {props.offer.armors.map((armor) => (
        <PickButton
          key={armor.name}
          label={armor.name}
          description={armor.description}
          selected={props.state.armorName === armor.name}
          onSelect={() => props.setState({ ...props.state, armorName: armor.name })}
        />
      ))}
    </OptionGroup>
  )
}

function OffHandGroup(props: {
  offer: StartingLoadoutOffer
  state: EquipmentSelectionState
  setState: (next: EquipmentSelectionState) => void
}): JSX.Element | null {
  if (!offHandOptionsVisible(props.offer)) {
    return null
  }
  const twoHand =
    props.state.weaponName &&
    props.offer.weapons.find((w) => w.name === props.state.weaponName)?.handedness === 'twoHand'
  return (
    <OptionGroup
      title="Off-hand (pick 1)"
      hint={twoHand ? 'Two-handed weapons leave no room for a shield or second weapon.' : undefined}
    >
      {props.offer.offHand.map((option) => (
        <PickButton
          key={option.id}
          label={option.label}
          selected={props.state.offHandChoice === option.id}
          disabled={offHandOptionDisabled(props.offer, props.state.weaponName, option.id)}
          onSelect={() => props.setState({ ...props.state, offHandChoice: option.id })}
        />
      ))}
    </OptionGroup>
  )
}

function SpellGroup(props: {
  offer: StartingLoadoutOffer
  state: EquipmentSelectionState
  setState: (next: EquipmentSelectionState) => void
}): JSX.Element | null {
  if (props.offer.spellPickCount <= 0) {
    return null
  }
  return (
    <OptionGroup title={`Spells (pick ${props.offer.spellPickCount})`}>
      {props.offer.spells.map((spell) => (
        <PickButton
          key={spell.key}
          label={spell.name}
          description={spellCardDescription(spell)}
          tooltip={formatSpellTooltip(spell)}
          tooltipId={`spell-tooltip-${spell.key}`}
          selected={props.state.spellKeys.includes(spell.key)}
          onSelect={() =>
            props.setState({
              ...props.state,
              spellKeys: toggleSpellSelection(
                props.state.spellKeys,
                spell.key,
                props.offer.spellPickCount
              )
            })
          }
        />
      ))}
    </OptionGroup>
  )
}

export function EquipmentSelectionForm(props: {
  offer: StartingLoadoutOffer
  state: EquipmentSelectionState
  setState: (next: EquipmentSelectionState) => void
  submitting: boolean
  error: string | null
  onConfirm: () => void
  onBack: () => void
}): JSX.Element {
  return (
    <div className="equipment-selection">
      <h1>Choose your starting gear</h1>
      <p className="equipment-selection-subtitle">
        {props.offer.archetype.charAt(0).toUpperCase()}
        {props.offer.archetype.slice(1)} loadout
      </p>
      <WeaponGroup offer={props.offer} state={props.state} setState={props.setState} />
      <ArmorGroup offer={props.offer} state={props.state} setState={props.setState} />
      <OffHandGroup offer={props.offer} state={props.state} setState={props.setState} />
      <SpellGroup offer={props.offer} state={props.state} setState={props.setState} />
      {props.error ? <p className="equipment-selection-error">{props.error}</p> : null}
      <div className="equipment-selection-actions">
        <OnboardingBackButton onBack={props.onBack} />
        <ProceedButton
          disabled={props.submitting || !canConfirmEquipmentSelection(props.offer, props.state)}
          onClick={() => void props.onConfirm()}
        >
          {props.submitting ? 'Equipping...' : 'Find your traveling companion'}
        </ProceedButton>
      </div>
    </div>
  )
}
