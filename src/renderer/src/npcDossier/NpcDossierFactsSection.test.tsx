import { describe, expect, it } from 'vitest'
import { NpcDossierFactsSection } from './NpcDossierFactsSection'
import { baseDossier, collectText, dossierFact } from './npcDossierTestUtils'

describe('NpcDossierFactsSection', () => {
  it('shows empty state when no facts are provided', () => {
    const tree = NpcDossierFactsSection({ facts: [] })
    const text = collectText(tree).join(' ')
    expect(text).toContain('Facts')
    expect(text).toContain('No facts recorded yet')
  })

  it('renders linked fact title and content from props', () => {
    const tree = NpcDossierFactsSection({
      facts: [dossierFact({ title: 'Mira', content: 'Runs the Oak & Ember.' })]
    })
    const text = collectText(tree).join(' ')
    expect(text).toContain('Mira')
    expect(text).toContain('Runs the Oak & Ember.')
  })

  it('renders only facts supplied in props (unrelated entries are not in the DTO)', () => {
    const tree = NpcDossierFactsSection({
      facts: [dossierFact({ id: 'linked', title: 'Mira', content: 'Linked note.' })]
    })
    const text = collectText(tree).join(' ')
    expect(text).toContain('Linked note.')
    expect(text).not.toContain('Unrelated person.')
    expect(text).not.toContain('rickety bridge')
  })

  it('preserves newest-first order from the DTO', () => {
    const tree = NpcDossierFactsSection({
      facts: [
        dossierFact({ id: 'new', title: 'Recent', content: 'Newest fact.' }),
        dossierFact({ id: 'old', title: 'Older', content: 'Older fact.' })
      ]
    })
    const text = collectText(tree).join(' ')
    expect(text.indexOf('Newest fact.')).toBeLessThan(text.indexOf('Older fact.'))
  })
})

describe('NpcDossierFactsSection dossier integration', () => {
  it('uses dossier facts without inventing extra entries', () => {
    const dossier = baseDossier({
      facts: [dossierFact({ title: 'Mira', content: 'Runs the Oak & Ember.' })]
    })
    const tree = NpcDossierFactsSection({ facts: dossier.facts })
    const text = collectText(tree).join(' ')
    expect(text).toContain('Runs the Oak & Ember.')
    expect(text).not.toContain('Nothing recorded yet')
  })
})
