/** @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest'
import { applySpellcheckToEditableFields } from './applySpellcheck'

describe('applySpellcheckToEditableFields', () => {
  it('enables spellcheck on textareas and text inputs only', () => {
    document.body.innerHTML = `
      <textarea id="notes"></textarea>
      <input id="action" type="text" />
      <input id="secret" type="password" />
      <input id="score" type="number" />
      <input id="legacy" />
    `

    applySpellcheckToEditableFields(document.body)

    expect((document.getElementById('notes') as HTMLTextAreaElement).spellcheck).toBe(true)
    expect((document.getElementById('action') as HTMLInputElement).spellcheck).toBe(true)
    expect((document.getElementById('legacy') as HTMLInputElement).spellcheck).toBe(true)
    expect((document.getElementById('secret') as HTMLInputElement).spellcheck).toBe(false)
    expect((document.getElementById('score') as HTMLInputElement).spellcheck).toBe(false)
  })
})
