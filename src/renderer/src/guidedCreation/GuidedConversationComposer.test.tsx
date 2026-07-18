import { describe, expect, it, vi } from 'vitest'
import { GuidedConversationComposerView } from './GuidedConversationComposerView'

function collectText(node: unknown): string {
  if (node == null || typeof node === 'boolean') {
    return ''
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }
  if (Array.isArray(node)) {
    return node.map(collectText).join('')
  }
  if (typeof node === 'object' && node !== null && 'props' in node) {
    return collectText((node as { props?: { children?: unknown } }).props?.children)
  }
  return ''
}

type ButtonEntry = { label: string; disabled?: boolean; onClick?: () => void }

function readButton(node: {
  type?: unknown
  props?: { children?: unknown; disabled?: boolean; onClick?: () => void }
}): ButtonEntry[] {
  if (node.type !== 'button') {
    return buttonEntries(node.props?.children)
  }
  return [
    {
      label: collectText(node.props?.children),
      disabled: node.props?.disabled,
      onClick: node.props?.onClick
    }
  ]
}

function buttonEntries(node: unknown): ButtonEntry[] {
  if (Array.isArray(node)) {
    return node.flatMap(buttonEntries)
  }
  if (typeof node !== 'object' || node === null || !('type' in node) || !('props' in node)) {
    return []
  }
  return readButton(
    node as { type?: unknown; props?: { children?: unknown; disabled?: boolean; onClick?: () => void } }
  )
}

const idleProps = {
  inputValue: '',
  inputDisabled: false,
  sending: false,
  generating: false,
  generateLabel: 'Generate',
  phaseComplete: false,
  onInputChange: () => {},
  onSend: () => {}
}

describe('GuidedConversationComposer generate button', () => {
  it('renders Generate beside Send and invokes onGenerate', () => {
    const onGenerate = vi.fn()
    const buttons = buttonEntries(GuidedConversationComposerView({ ...idleProps, onGenerate }))
    expect(buttons.map((button) => button.label)).toEqual(['Send', 'Generate'])
    buttons.find((button) => button.label === 'Generate')?.onClick?.()
    expect(onGenerate).toHaveBeenCalledOnce()
  })

  it('shows the animated generating label and disables while generating', () => {
    const buttons = buttonEntries(
      GuidedConversationComposerView({
        ...idleProps,
        generating: true,
        generateLabel: 'Generating.',
        onGenerate: () => {}
      })
    )
    expect(buttons.find((button) => button.label === 'Generating.')?.disabled).toBe(true)
  })

  it('disables Generate when input is disabled', () => {
    const buttons = buttonEntries(
      GuidedConversationComposerView({ ...idleProps, inputDisabled: true, onGenerate: () => {} })
    )
    expect(buttons.find((button) => button.label === 'Generate')?.disabled).toBe(true)
  })
})
