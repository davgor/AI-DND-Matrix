import { describe, expect, it, vi } from 'vitest'
import { ProviderModeSelector } from './ProviderModeSelector'

describe('ProviderModeSelector', () => {
  it('renders an accessible Provider dropdown instead of radios', () => {
    const onChange = vi.fn()
    const node = ProviderModeSelector({ mode: 'claude', onChange })

    expect(node.type).toBe('div')
    expect(node.props.className).toBe('settings-provider-mode')

    const [label, select] = node.props.children as [
      { type: string; props: { htmlFor: string; children: string } },
      {
        type: string
        props: {
          id: string
          'aria-label': string
          value: string
          children: Array<{ props: { value: string; children: string } }>
        }
      }
    ]

    expect(label.type).toBe('label')
    expect(label.props.htmlFor).toBe('settings-provider-mode')
    expect(label.props.children).toBe('Provider')
    expect(select.type).toBe('select')
    expect(select.props.id).toBe('settings-provider-mode')
    expect(select.props['aria-label']).toBe('Provider')
    expect(select.props.value).toBe('claude')

    const values = select.props.children.map((option) => option.props.value)
    expect(values).toEqual(['claude', 'openai', 'gemini', 'grok', 'player2', 'llamacpp'])
  })
})
