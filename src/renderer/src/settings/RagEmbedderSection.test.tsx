import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_PROVIDER_SETTINGS } from '../../../shared/settings/types'
import { RagEmbedderSection } from './RagEmbedderSection'

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
    return children
      .map((child) => {
        if (typeof child === 'string' || typeof child === 'number') {
          return String(child)
        }
        if (child && typeof child === 'object' && 'props' in child) {
          return textOf(child as { props?: Record<string, unknown> })
        }
        return ''
      })
      .join('')
  }
  if (children && typeof children === 'object' && 'props' in (children as object)) {
    return textOf(children as { props?: Record<string, unknown> })
  }
  return ''
}

function joinedText(node: JSX.Element): string {
  return flattenElements(node).map(textOf).join(' ')
}

describe('RagEmbedderSection copy', () => {
  it('never labels lexical mode as semantic', () => {
    const node = RagEmbedderSection({
      draft: {
        ...DEFAULT_PROVIDER_SETTINGS,
        ragEmbedder: {
          ...DEFAULT_PROVIDER_SETTINGS.ragEmbedder,
          enabled: true,
          mode: 'lexical'
        }
      },
      openaiApiKeySet: false,
      geminiApiKeySet: false,
      onChange: () => undefined,
      onDownloadModel: async () => undefined
    })
    const joined = joinedText(node).toLowerCase()
    expect(joined).not.toMatch(/\bsemantic\b/)
    expect(joined).toMatch(/lexical|keyword/)
  })
})

describe('RagEmbedderSection readiness', () => {
  it('shows Needs setup for cloud when key missing', () => {
    const node = RagEmbedderSection({
      draft: {
        ...DEFAULT_PROVIDER_SETTINGS,
        ragEmbedder: {
          ...DEFAULT_PROVIDER_SETTINGS.ragEmbedder,
          enabled: true,
          mode: 'openai'
        }
      },
      openaiApiKeySet: false,
      geminiApiKeySet: false,
      onChange: () => undefined,
      onDownloadModel: async () => undefined
    })
    expect(joinedText(node)).toMatch(/Needs setup/i)
  })

  it('shows Needs setup for local when assets missing', () => {
    const node = RagEmbedderSection({
      draft: {
        ...DEFAULT_PROVIDER_SETTINGS,
        ragEmbedder: {
          ...DEFAULT_PROVIDER_SETTINGS.ragEmbedder,
          enabled: true,
          mode: 'local_neural',
          localDownloadState: 'idle',
          localModelPath: ''
        }
      },
      openaiApiKeySet: false,
      geminiApiKeySet: false,
      onChange: () => undefined,
      onDownloadModel: async () => undefined
    })
    expect(joinedText(node)).toMatch(/Needs setup/i)
  })
})

describe('RagEmbedderSection mode switch', () => {
  it('switches mode via radio without leaking secrets', () => {
    const onChange = vi.fn()
    const node = RagEmbedderSection({
      draft: DEFAULT_PROVIDER_SETTINGS,
      openaiApiKeySet: true,
      geminiApiKeySet: false,
      onChange,
      onDownloadModel: async () => undefined
    })
    const radios = flattenElements(node).filter((el) => el.props?.name === 'rag-embedder-mode')
    expect(radios.length).toBeGreaterThan(1)
    const unchecked = radios.find((el) => el.props?.checked === false)
    expect(unchecked).toBeDefined()
    const handler = unchecked?.props?.onChange as (() => void) | undefined
    handler?.()
    expect(JSON.stringify(onChange.mock.calls)).not.toMatch(/sk-|api[_-]?key/i)
    expect(onChange).toHaveBeenCalled()
  })
})
