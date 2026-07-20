import { describe, expect, it, vi } from 'vitest'
import { CUSTOM_MODEL_OPTION_VALUE } from '../../../shared/settings/modelCatalogs'
import { ModelPicker } from './ModelPicker'

describe('ModelPicker', () => {
  it('renders a model dropdown populated from the catalog', () => {
    const onChange = vi.fn()
    const node = ModelPicker({ provider: 'openai', modelId: 'gpt-4.1-mini', onChange })

    expect(node.props.className).toBe('settings-model-picker')
    const children = node.props.children as unknown[]
    const select = children.find(
      (child) => typeof child === 'object' && child !== null && (child as { type: string }).type === 'select'
    ) as {
      props: {
        value: string
        children: Array<{ props: { value: string } }>
      }
    }

    expect(select.props.value).toBe('gpt-4.1-mini')
    const values = select.props.children.map((option) => option.props.value)
    expect(values).toContain('gpt-4.1-mini')
    expect(values).toContain(CUSTOM_MODEL_OPTION_VALUE)
  })

  it('shows a custom model id field when the model is not in the catalog', () => {
    const onChange = vi.fn()
    const node = ModelPicker({ provider: 'openai', modelId: 'my-custom', onChange })
    const flat = flattenElements(node)
    const customInput = flat.find(
      (el) => el.props?.['aria-label'] === 'Custom model id'
    )
    expect(customInput?.props?.value).toBe('my-custom')
  })
})

function flattenElements(node: { type?: unknown; props?: Record<string, unknown> }): Array<{
  props?: Record<string, unknown>
}> {
  const result: Array<{ props?: Record<string, unknown> }> = [node]
  const children = node.props?.children
  if (Array.isArray(children)) {
    for (const child of children) {
      if (child && typeof child === 'object') {
        result.push(...flattenElements(child as { type?: unknown; props?: Record<string, unknown> }))
      }
    }
  } else if (children && typeof children === 'object') {
    result.push(...flattenElements(children as { type?: unknown; props?: Record<string, unknown> }))
  }
  return result
}
