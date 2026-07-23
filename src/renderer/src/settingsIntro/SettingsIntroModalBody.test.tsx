import { describe, expect, it, vi } from 'vitest'
import { SettingsIntroAskBackend } from './SettingsIntroAskBackend'
import { SettingsIntroAskLocal } from './SettingsIntroAskLocal'
import { SettingsIntroSetupProgress } from './SettingsIntroSetupProgress'
import { SettingsIntroModalBody } from './SettingsIntroModalBody'
import type { SettingsIntroWizardController } from './useSettingsIntroWizard'

function flattenElements(node: { type?: unknown; props?: Record<string, unknown> } | null | undefined): Array<{
  type?: unknown
  props?: Record<string, unknown>
}> {
  if (!node || typeof node !== 'object') {
    return []
  }
  const kids = node.props?.children
  const list = Array.isArray(kids) ? kids : kids != null ? [kids] : []
  return [
    node,
    ...list.flatMap((child) =>
      flattenElements(child as { type?: unknown; props?: Record<string, unknown> })
    )
  ]
}

function textOf(node: { props?: Record<string, unknown> }): string {
  const children = node.props?.children
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children)
  }
  if (Array.isArray(children)) {
    return children.map((child) => (typeof child === 'string' ? child : '')).join('')
  }
  return ''
}

function wizardStub(partial: Partial<SettingsIntroWizardController>): SettingsIntroWizardController {
  return {
    step: 'askLocal',
    backend: 'vulkan',
    setupProgressText: null,
    setupProgressPercent: null,
    setupError: null,
    chooseLocal: vi.fn(),
    setBackend: vi.fn(),
    startSetup: vi.fn(),
    retrySetup: vi.fn(),
    ...partial
  }
}

describe('SettingsIntroAskLocal', () => {
  it('asks about downloading a local LLM', () => {
    const node = SettingsIntroAskLocal({
      onYes: () => undefined,
      onNo: () => undefined
    })
    expect(flattenElements(node).map(textOf).join(' ')).toMatch(/Download a local LLM/i)
  })
})

function findInputById(
  flat: Array<{ type?: unknown; props?: Record<string, unknown> }>,
  id: string,
  inputType: string
): { type?: unknown; props?: Record<string, unknown> } | undefined {
  return flat.find(
    (el) => el.type === 'input' && el.props?.type === inputType && el.props?.id === id
  )
}

function expectBackendRadios(
  flat: Array<{ type?: unknown; props?: Record<string, unknown> }>,
  gpuId: string,
  cpuId: string,
  name: string
): { type?: unknown; props?: Record<string, unknown> } {
  const gpu = findInputById(flat, gpuId, 'radio')
  const cpu = findInputById(flat, cpuId, 'radio')
  expect(gpu).toBeDefined()
  expect(cpu).toBeDefined()
  expect(gpu?.props?.name).toBe(name)
  expect(cpu?.props?.name).toBe(name)
  expect(gpu?.props?.checked).toBe(true)
  expect(cpu?.props?.checked).toBe(false)
  return cpu as { type?: unknown; props?: Record<string, unknown> }
}

describe('SettingsIntroAskBackend', () => {
  it('shows GPU/CPU radios and wires selection', () => {
    const onBackendChange = vi.fn()
    const node = SettingsIntroAskBackend({
      backend: 'vulkan',
      onBackendChange,
      onContinue: () => undefined
    })
    const flat = flattenElements(node)
    const cpu = expectBackendRadios(
      flat,
      'settings-intro-runtime-gpu',
      'settings-intro-runtime-cpu',
      'settings-intro-runtime-backend'
    )
    expect(flat.map(textOf).join(' ')).toMatch(/GPU or CPU/i)
    const onChangeHandler = cpu.props?.onChange as (() => void) | undefined
    onChangeHandler?.()
    expect(onBackendChange).toHaveBeenCalledWith('cpu')
  })
})

describe('SettingsIntroSetupProgress', () => {
  it('shows setup progress while downloading', () => {
    const node = SettingsIntroSetupProgress({
      progressText: 'Downloading… 10%',
      progressPercent: 10,
      error: null,
      onRetry: () => undefined,
      onSkip: () => undefined
    })
    const flat = flattenElements(node)
    expect(flat.map(textOf).join(' ')).toMatch(/Setting up local LLM/i)
    expect(flat.some((el) => el.type === 'progress')).toBe(true)
  })
})

describe('SettingsIntroModalBody routing', () => {
  it('routes askLocal to the local download prompt', () => {
    const node = SettingsIntroModalBody({
      wizard: wizardStub({ step: 'askLocal' }),
      onDismiss: () => undefined,
      onOpenSettings: () => undefined
    })
    expect(node.type).toBe(SettingsIntroAskLocal)
  })
})
