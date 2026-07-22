import { describe, expect, it } from 'vitest'
import { NpcDossierOpinionSection } from './NpcDossierOpinionSection'
import { collectText } from './npcDossierTestUtils'
import { playerOpinionSubject } from '../../../shared/npcRelationships/types'

const aboutYou = {
  subject: playerOpinionSubject('hero-1'),
  label: 'About you'
}

describe('NpcDossierOpinionSection summary', () => {
  it('shows summary text when present', () => {
    const tree = NpcDossierOpinionSection({
      opinion: {
        summary: 'Glad the party stopped by.',
        generatedAt: '2026-07-20T12:00:00.000Z',
        stale: false
      },
      subjects: [aboutYou],
      selectedKey: 'player_character:hero-1',
      onSelectSubject: () => undefined
    })
    expect(collectText(tree).join(' ')).toContain('Glad the party stopped by.')
  })

  it('shows empty copy when summary is null for another subject', () => {
    const tree = NpcDossierOpinionSection({
      opinion: { summary: null, generatedAt: null, stale: false },
      subjects: [aboutYou, { subject: playerOpinionSubject('ally-1'), label: 'Ally' }],
      selectedKey: 'player_character:ally-1',
      onSelectSubject: () => undefined
    })
    expect(collectText(tree).join(' ')).toContain('Unable to summarize yet')
  })
})

describe('NpcDossierOpinionSection affordances', () => {
  it('shows pending note when opinion is stale', () => {
    const tree = NpcDossierOpinionSection({
      opinion: {
        summary: 'Previous summary.',
        generatedAt: '2026-07-20T12:00:00.000Z',
        stale: true
      },
      subjects: [aboutYou],
      selectedKey: 'player_character:hero-1',
      onSelectSubject: () => undefined
    })
    const text = collectText(tree).join(' ')
    expect(text).toContain('Previous summary.')
    expect(text).toContain('Updating')
  })

  it('offers relationship web affordance when provided', () => {
    const tree = NpcDossierOpinionSection({
      opinion: { summary: null, generatedAt: null, stale: false },
      subjects: [aboutYou],
      selectedKey: 'player_character:hero-1',
      onSelectSubject: () => undefined,
      onOpenRelationshipWeb: () => undefined
    })
    expect(collectText(tree).join(' ')).toContain('Relationship web')
  })
})
