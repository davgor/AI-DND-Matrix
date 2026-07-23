/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'
import { EquipmentSelectionForm } from './EquipmentSelectionForm'
import { OnboardingBackButton } from '../onboarding/OnboardingBackButton'
import { ProceedButton } from '../onboarding/ProceedButton'
import { initialEquipmentSelectionState } from './equipmentSelectionLogic'
import type { StartingLoadoutOffer } from '../../../shared/startingLoadout/types'
import { STARTING_OFF_HAND_EMPTY } from '../../../engine/startingLoadout/packages'

const fighterOffer: StartingLoadoutOffer = {
  archetype: 'fighter',
  weapons: [{ name: 'Longsword', description: 'A reliable steel longsword.', handedness: 'oneHand' }],
  armors: [{ name: 'Chain Hauberk', description: 'Mail armor.' }],
  offHand: [
    { id: 'Wooden Shield', label: 'Wooden Shield' },
    { id: STARTING_OFF_HAND_EMPTY, label: 'Empty' }
  ],
  spells: [
    {
      key: 'rallying-strike',
      name: 'Rallying Strike',
      effectType: 'damage',
      range: 'melee',
      cost: 1,
      tags: ['morale']
    }
  ],
  spellPickCount: 1
}

function isElement(node: ReactNode): node is ReactElement {
  return typeof node === 'object' && node !== null && 'props' in node
}

function findByClassName(node: ReactNode, className: string): ReactElement | undefined {
  if (!isElement(node)) {
    return undefined
  }
  if (node.props.className?.includes(className)) {
    return node
  }
  const children = node.props.children
  if (Array.isArray(children)) {
    for (const child of children) {
      const match = findByClassName(child, className)
      if (match) {
        return match
      }
    }
    return undefined
  }
  return findByClassName(children, className)
}

function findComponent(node: ReactNode, component: unknown): ReactElement | undefined {
  if (!isElement(node)) {
    return undefined
  }
  if (node.type === component) {
    return node
  }
  const children = node.props.children
  if (Array.isArray(children)) {
    for (const child of children) {
      const match = findComponent(child, component)
      if (match) {
        return match
      }
    }
    return undefined
  }
  return findComponent(children, component)
}

describe('EquipmentSelectionForm', () => {
  it('invokes onBack when Back is clicked', () => {
    const onBack = vi.fn()
    const tree = EquipmentSelectionForm({
      offer: fighterOffer,
      state: initialEquipmentSelectionState(fighterOffer),
      setState: () => {},
      submitting: false,
      error: null,
      onConfirm: () => {},
      onBack
    })

    const backSlot = findComponent(tree, OnboardingBackButton)
    expect(backSlot).toBeDefined()
    const backButton = OnboardingBackButton({ onBack: backSlot!.props.onBack })
    expect(findByClassName(backButton, 'onboarding-back-arrow')).toBeDefined()
    backButton.props.onClick()
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('labels the proceed button for the companions step, not identity interview', () => {
    const tree = EquipmentSelectionForm({
      offer: fighterOffer,
      state: initialEquipmentSelectionState(fighterOffer),
      setState: () => {},
      submitting: false,
      error: null,
      onConfirm: () => {},
      onBack: () => {}
    })

    const proceed = findComponent(tree, ProceedButton)
    expect(proceed).toBeDefined()
    expect(proceed!.props.children).toBe('Find your traveling companion')
  })
})
