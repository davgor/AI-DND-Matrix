import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as devBuild from '../dev/isRendererDevBuild'
import { DEFAULT_CAMPAIGN_SETUP_FORM, MAX_REGION_COUNT, MIN_REGION_COUNT } from '../../../shared/campaignCreate/types'
import { CampaignStartFormFields } from './CampaignStartFormFields'
import type { CampaignStartFlow } from './useCampaignStartFlow'

beforeEach(() => {
  vi.spyOn(devBuild, 'isRendererDevBuild').mockReturnValue(true)
})

function isJsxElement(node: unknown): node is JSX.Element {
  return typeof node === 'object' && node !== null && 'props' in node
}

function expandNode(node: unknown): unknown {
  if (typeof node === 'function') {
    return expandNode(node({}))
  }
  if (!isJsxElement(node)) {
    return node
  }
  if (typeof node.type === 'function') {
    return expandNode(node.type(node.props))
  }
  const children = node.props.children
  if (children === undefined) {
    return node
  }
  const expandedChildren = Array.isArray(children)
    ? children.map((child) => expandNode(child))
    : expandNode(children)
  return { ...node, props: { ...node.props, children: expandedChildren } }
}

function collectElements(node: unknown): JSX.Element[] {
  const expanded = expandNode(node)
  if (!isJsxElement(expanded)) {
    return []
  }
  const children = expanded.props.children
  const nested = Array.isArray(children)
    ? children.flatMap((child) => collectElements(child))
    : collectElements(children)
  return [expanded, ...nested]
}

function findDiceButtons(node: JSX.Element): JSX.Element[] {
  return collectElements(node).filter((element) => element.props?.className === 'field-random-dice')
}

function makeFlow(updateForm: CampaignStartFlow['updateForm']): CampaignStartFlow {
  return {
    view: 'form',
    form: { ...DEFAULT_CAMPAIGN_SETUP_FORM },
    fieldError: null,
    flowError: null,
    submitting: false,
    progressStage: null,
    progressStageIndex: 0,
    progressStageTotal: 0,
    progressLabel: '',
    open: () => {},
    close: () => {},
    updateForm,
    submit: async () => null,
    retry: async () => null,
    backToForm: () => {}
  }
}

describe('CampaignStartFormFields random dice', () => {
  it('renders per-field dice controls in dev builds', () => {
    const node = CampaignStartFormFields({
      flow: makeFlow(vi.fn()),
      isError: false
    })

    const diceButtons = findDiceButtons(node)
    expect(diceButtons.length).toBeGreaterThanOrEqual(5)
    expect(diceButtons.some((button) => button.props['aria-label'] === 'Random campaign premise')).toBe(
      true
    )
  })

  it('premise dice updates only the premise field', () => {
    const updateForm = vi.fn()
    const node = CampaignStartFormFields({
      flow: makeFlow(updateForm),
      isError: false
    })

    const premiseDice = findDiceButtons(node).find(
      (button) => button.props['aria-label'] === 'Random campaign premise'
    )
    premiseDice?.props.onClick()

    expect(updateForm).toHaveBeenCalledTimes(1)
    const patch = updateForm.mock.calls[0]?.[0] as { premisePrompt?: string; deathMode?: string }
    expect(patch.premisePrompt?.trim().length).toBeGreaterThan(0)
    expect(patch.deathMode).toBeUndefined()
  })

  it('region count dice stays within bounds', () => {
    const updateForm = vi.fn()
    const node = CampaignStartFormFields({
      flow: makeFlow(updateForm),
      isError: false
    })

    const regionDice = findDiceButtons(node).find(
      (button) => button.props['aria-label'] === 'Random region count'
    )
    regionDice?.props.onClick()

    const patch = updateForm.mock.calls[0]?.[0] as { regionCount?: number }
    expect(patch.regionCount).toBeGreaterThanOrEqual(MIN_REGION_COUNT)
    expect(patch.regionCount).toBeLessThanOrEqual(MAX_REGION_COUNT)
  })
})
