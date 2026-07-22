import { describe, expect, it } from 'vitest'
import { NpcDossierModalBody } from './NpcDossierModalBody'
import { baseDossier, collectSectionHeadings, collectText } from './npcDossierTestUtils'
import { playerOpinionSubject } from '../../../shared/npcRelationships/types'

const aboutYou = {
  subject: playerOpinionSubject('hero-1'),
  label: 'About you'
}

describe('NpcDossierModalBody section order', () => {
  it('renders Traits, Facts, Opinion, and Disposition in binding order', () => {
    const tree = NpcDossierModalBody({
      dossier: baseDossier(),
      loading: false,
      error: null,
      subjects: [aboutYou],
      selectedSubjectKey: 'player_character:hero-1',
      onSelectSubject: () => undefined
    })
    expect(collectSectionHeadings(tree)).toEqual([
      'Traits',
      'Facts',
      'Opinion (DM)',
      'Disposition'
    ])
  })

  it('shows loading copy while dossier is loading', () => {
    const tree = NpcDossierModalBody({ dossier: null, loading: true, error: null })
    expect(collectText(tree).join(' ')).toContain('Loading')
  })

  it('defaults opinion to about-you summary from dossier', () => {
    const dossier = baseDossier()
    const tree = NpcDossierModalBody({
      dossier,
      loading: false,
      subjects: [aboutYou],
      selectedSubjectKey: 'player_character:hero-1',
      onSelectSubject: () => undefined
    })
    expect(collectText(tree).join(' ')).toContain(dossier.opinion.summary ?? '')
  })
})
