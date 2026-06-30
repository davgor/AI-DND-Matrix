import { describe, expect, it } from 'vitest'
import { buildAdditionalRegionPrompt } from '.'

describe('history-aware additional region prompt (038.16)', () => {
  it('includes campaign history fields when context is provided', () => {
    const prompt = buildAdditionalRegionPrompt('A war-torn realm', ['Oakhollow'], {
      seedPrompt: 'Northern pass',
      npcCount: 3,
      history: {
      currentStateSummary: 'The king is dead.',
      regionSummaries: [
        { name: 'Oakhollow', description: 'A village', recentHistory: 'Raided last week.' }
      ],
      storyThreadSummaries: [{ title: 'Crown', state: 'active', summary: 'Succession crisis' }],
      recentEvents: ['The village burned.']
      }
    })
    expect(prompt).toContain('The king is dead.')
    expect(prompt).toContain('Raided last week.')
    expect(prompt).toContain('Succession crisis')
    expect(prompt).toContain('The village burned.')
  })
})
