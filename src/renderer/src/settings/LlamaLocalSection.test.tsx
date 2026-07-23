import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_PROVIDER_SETTINGS } from '../../../shared/settings/types'
import { LlamaLocalSection } from './LlamaLocalSection'

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

describe('LlamaLocalSection catalog render', () => {
  it('renders the curated catalog with size and VRAM hints', () => {
    const node = LlamaLocalSection({
      draft: { ...DEFAULT_PROVIDER_SETTINGS, mode: 'llamacpp' },
      errors: [],
      result: null,
      onChange: () => undefined,
      onCheckRuntime: async () => undefined
    })
    const flat = flattenElements(node)
    const joined = flat.map(textOf).join(' ')
    expect(joined).toMatch(/Qwen2\.5 7B Instruct/i)
    expect(joined).toMatch(/~4\.7 GB/i)
    expect(joined).toMatch(/8 GB\+ VRAM/i)
    expect(flat.some((el) => el.props?.['aria-label'] === 'Recommended models')).toBe(true)
  })
})

describe('LlamaLocalSection catalog selection', () => {
  it('persists catalog selection via onChange', () => {
    const onChange = vi.fn()
    const node = LlamaLocalSection({
      draft: { ...DEFAULT_PROVIDER_SETTINGS, mode: 'llamacpp' },
      errors: [],
      result: null,
      onChange,
      onCheckRuntime: async () => undefined
    })
    const flat = flattenElements(node)
    const radio = flat.find(
      (el) => el.type === 'input' && el.props?.type === 'radio' && el.props?.name === 'llama-catalog-model'
    )
    expect(radio).toBeDefined()
    const onChangeHandler = radio?.props?.onChange as (() => void) | undefined
    onChangeHandler?.()
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        llamaCppCatalogModelId: 'qwen25-7b-instruct-q4-k-m',
        llamaCppDownloadState: 'idle'
      })
    )
  })
})

describe('LlamaLocalSection download state', () => {
  it('shows download state for the selected catalog entry', () => {
    const node = LlamaLocalSection({
      draft: {
        ...DEFAULT_PROVIDER_SETTINGS,
        mode: 'llamacpp',
        llamaCppCatalogModelId: 'qwen25-7b-instruct-q4-k-m',
        llamaCppDownloadState: 'ready'
      },
      errors: [],
      result: null,
      onChange: () => undefined,
      onCheckRuntime: async () => undefined
    })
    expect(flattenElements(node).some((el) => textOf(el) === 'Ready')).toBe(true)
  })

  it('renders verbose multi-line check output in a pre block', () => {
    const message = 'Local llama.cpp check failed.\nmode: managed\nbody: {"error":"boom"}'
    const node = LlamaLocalSection({
      draft: { ...DEFAULT_PROVIDER_SETTINGS, mode: 'llamacpp' },
      errors: [],
      result: { ok: false, message },
      onChange: () => undefined,
      onCheckRuntime: async () => undefined
    })
    const pre = flattenElements(node).find((el) => el.type === 'pre')
    expect(pre).toBeDefined()
    expect(String(pre?.props?.className)).toMatch(/settings-check-verbose/)
    expect(textOf(pre!)).toContain('body: {"error":"boom"}')
  })
})

describe('LlamaLocalSection download progress', () => {
  it('renders a progress bar and progress text while downloading', () => {
    const node = LlamaLocalSection({
      draft: {
        ...DEFAULT_PROVIDER_SETTINGS,
        mode: 'llamacpp',
        llamaCppCatalogModelId: 'qwen25-7b-instruct-q4-k-m',
        llamaCppDownloadState: 'downloading'
      },
      errors: [],
      result: null,
      downloadProgressText: 'Downloading… 26% (1.12 GB / 4.38 GB)',
      downloadProgressPercent: 26,
      onChange: () => undefined,
      onCheckRuntime: async () => undefined
    })
    const flat = flattenElements(node)
    const bar = flat.find(
      (el) => el.type === 'progress' && el.props?.['aria-label'] === 'Model download progress'
    )
    expect(bar).toBeDefined()
    expect(bar?.props?.value).toBe(26)
    expect(bar?.props?.max).toBe(100)
    expect(flat.map(textOf).join(' ')).toMatch(/Downloading… 26%/)
  })
})

describe('LlamaLocalSection advanced paths', () => {
  it('keeps advanced manual paths reachable under a disclosure', () => {
    const node = LlamaLocalSection({
      draft: {
        ...DEFAULT_PROVIDER_SETTINGS,
        mode: 'llamacpp',
        llamaCppStartMode: 'managed'
      },
      errors: [],
      result: null,
      onChange: () => undefined,
      onCheckRuntime: async () => undefined
    })
    const flat = flattenElements(node)
    expect(flat.some((el) => el.type === 'details')).toBe(true)
    expect(flat.map(textOf).join(' ')).toMatch(/Advanced: manual server/i)
  })
})

describe('LlamaLocalSection runtime backend', () => {
  it('exposes GPU and CPU checkboxes and persists the chosen backend', () => {
    const onChange = vi.fn()
    const node = LlamaLocalSection({
      draft: {
        ...DEFAULT_PROVIDER_SETTINGS,
        mode: 'llamacpp',
        llamaCppRuntimeBackend: 'vulkan'
      },
      errors: [],
      result: null,
      onChange,
      onCheckRuntime: async () => undefined
    })
    const flat = flattenElements(node)
    const gpu = flat.find(
      (el) => el.type === 'input' && el.props?.type === 'checkbox' && el.props?.id === 'settings-llama-runtime-gpu'
    )
    const cpu = flat.find(
      (el) => el.type === 'input' && el.props?.type === 'checkbox' && el.props?.id === 'settings-llama-runtime-cpu'
    )
    expect(gpu).toBeDefined()
    expect(cpu).toBeDefined()
    expect(gpu?.props?.checked).toBe(true)
    expect(cpu?.props?.checked).toBe(false)
    const joined = flat.map(textOf).join(' ')
    expect(joined).toMatch(/GPU \(Vulkan\)/i)
    expect(joined).toMatch(/\bCPU\b/)
    const onChangeHandler = cpu?.props?.onChange as
      | ((event: { target: { checked: boolean } }) => void)
      | undefined
    onChangeHandler?.({ target: { checked: true } })
    expect(onChange).toHaveBeenCalledWith({ llamaCppRuntimeBackend: 'cpu' })
  })
})
