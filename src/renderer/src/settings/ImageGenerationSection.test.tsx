import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_PROVIDER_SETTINGS } from '../../../shared/settings/types'
import { ImageGenerationSection } from './ImageGenerationSection'

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

function findByTestId(node: JSX.Element, testId: string): { props?: Record<string, unknown> } | undefined {
  return flattenElements(node).find((element) => element.props?.['data-testid'] === testId)
}

describe('ImageGenerationSection copy', () => {
  it('states Claude is not an image provider', () => {
    const node = ImageGenerationSection({
      draft: DEFAULT_PROVIDER_SETTINGS,
      openaiApiKeySet: false,
      geminiApiKeySet: false,
      grokApiKeySet: false,
      onChange: () => undefined,
      onDownloadModel: async () => undefined
    })
    expect(joinedText(node)).toMatch(/Claude is LLM-only/i)
  })

  it('does not list Claude as a provider radio', () => {
    const node = ImageGenerationSection({
      draft: DEFAULT_PROVIDER_SETTINGS,
      openaiApiKeySet: false,
      geminiApiKeySet: false,
      grokApiKeySet: false,
      onChange: () => undefined,
      onDownloadModel: async () => undefined
    })
    const fieldset = flattenElements(node).find(
      (element) => element.props?.['aria-label'] === 'Image provider mode'
    )
    expect(fieldset).toBeDefined()
    const joined = joinedText(node).toLowerCase()
    expect(joined).toMatch(/llm-only/)
  })
})

describe('ImageGenerationSection readiness', () => {
  it('shows Needs setup for cloud when key missing', () => {
    const node = ImageGenerationSection({
      draft: {
        ...DEFAULT_PROVIDER_SETTINGS,
        imageGeneration: {
          ...DEFAULT_PROVIDER_SETTINGS.imageGeneration,
          enabled: true,
          mode: 'openai'
        }
      },
      openaiApiKeySet: false,
      geminiApiKeySet: false,
      grokApiKeySet: false,
      onChange: () => undefined,
      onDownloadModel: async () => undefined
    })
    const status = findByTestId(node, 'image-generation-status')
    expect(textOf(status!)).toMatch(/Needs setup/i)
  })

  it('shows Ready when cloud key present', () => {
    const node = ImageGenerationSection({
      draft: {
        ...DEFAULT_PROVIDER_SETTINGS,
        imageGeneration: {
          ...DEFAULT_PROVIDER_SETTINGS.imageGeneration,
          enabled: true,
          mode: 'openai'
        }
      },
      openaiApiKeySet: true,
      geminiApiKeySet: false,
      grokApiKeySet: false,
      onChange: () => undefined,
      onDownloadModel: async () => undefined
    })
    const status = findByTestId(node, 'image-generation-status')
    expect(textOf(status!)).toMatch(/Ready/)
  })
})

describe('ImageGenerationSection dual-load warning', () => {
  it('shows VRAM warning for Vulkan LLM + local image enabled', () => {
    const node = ImageGenerationSection({
      draft: {
        ...DEFAULT_PROVIDER_SETTINGS,
        mode: 'llamacpp',
        llamaCppRuntimeBackend: 'vulkan',
        imageGeneration: {
          ...DEFAULT_PROVIDER_SETTINGS.imageGeneration,
          enabled: true,
          mode: 'local'
        }
      },
      openaiApiKeySet: false,
      geminiApiKeySet: false,
      grokApiKeySet: false,
      onChange: () => undefined,
      onDownloadModel: async () => undefined
    })
    const warning = findByTestId(node, 'image-dual-load-warning')
    expect(warning).toBeDefined()
    expect(textOf(warning!)).toMatch(/12 GB/)
    expect(textOf(warning!)).toMatch(/idle unload/i)
  })

  it('hides VRAM warning when image generation disabled', () => {
    const node = ImageGenerationSection({
      draft: {
        ...DEFAULT_PROVIDER_SETTINGS,
        mode: 'llamacpp',
        llamaCppRuntimeBackend: 'vulkan',
        imageGeneration: {
          ...DEFAULT_PROVIDER_SETTINGS.imageGeneration,
          enabled: false,
          mode: 'local'
        }
      },
      openaiApiKeySet: false,
      geminiApiKeySet: false,
      grokApiKeySet: false,
      onChange: () => undefined,
      onDownloadModel: async () => undefined
    })
    expect(findByTestId(node, 'image-dual-load-warning')).toBeUndefined()
  })
})

describe('ImageGenerationSection enable toggle', () => {
  it('patches enabled flag on checkbox change', () => {
    const onChangeProp = vi.fn()
    const node = ImageGenerationSection({
      draft: DEFAULT_PROVIDER_SETTINGS,
      openaiApiKeySet: false,
      geminiApiKeySet: false,
      grokApiKeySet: false,
      onChange: onChangeProp,
      onDownloadModel: async () => undefined
    })
    const checkbox = flattenElements(node).find(
      (element) => element.props?.type === 'checkbox'
    )
    const handleChange = checkbox?.props?.onChange as
      | ((event: { target: { checked: boolean } }) => void)
      | undefined
    handleChange?.({ target: { checked: true } })
    expect(onChangeProp).toHaveBeenCalledWith({
      imageGeneration: {
        ...DEFAULT_PROVIDER_SETTINGS.imageGeneration,
        enabled: true
      }
    })
  })
})
