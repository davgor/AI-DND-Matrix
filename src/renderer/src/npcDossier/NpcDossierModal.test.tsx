import { describe, expect, it } from 'vitest'
import { NpcDossierModalBody } from './NpcDossierModalBody'
import { NpcDossierOpinionSection } from './NpcDossierOpinionSection'
import { baseDossier, collectSectionHeadings, collectText } from './npcDossierTestUtils'

describe('NpcDossierOpinionSection', () => {
  it('shows summary text when present', () => {
    const tree = NpcDossierOpinionSection({
      opinion: { summary: 'Glad the party stopped by.', generatedAt: '2026-07-20T12:00:00.000Z', stale: false }
    })
    const text = collectText(tree).join(' ')
    expect(text).toContain('Glad the party stopped by.')
  })

  it('shows empty copy when summary is null', () => {
    const tree = NpcDossierOpinionSection({
      opinion: { summary: null, generatedAt: null, stale: false }
    })
    const text = collectText(tree).join(' ')
    expect(text).toContain('Unable to summarize yet')
  })

  it('shows pending note when opinion is stale', () => {
    const tree = NpcDossierOpinionSection({
      opinion: { summary: 'Previous summary.', generatedAt: '2026-07-20T12:00:00.000Z', stale: true }
    })
    const text = collectText(tree).join(' ')
    expect(text).toContain('Previous summary.')
    expect(text).toContain('Updating')
  })
})

describe('NpcDossierModalBody section order', () => {
  it('renders Traits, Facts, Opinion, and Disposition in binding order', () => {
    const tree = NpcDossierModalBody({ dossier: baseDossier(), loading: false, error: null })
    expect(collectSectionHeadings(tree)).toEqual([
      'Traits',
      'Facts',
      'Opinion (DM)',
      'Disposition'
    ])
  })

  it('shows loading copy while dossier is loading', () => {
    const tree = NpcDossierModalBody({ dossier: null, loading: true, error: null })
    const text = collectText(tree).join(' ')
    expect(text).toContain('Loading')
  })
})
