import { describe, expect, it } from 'vitest'
import { NpcDossierDispositionSection } from './NpcDossierDispositionSection'
import { NpcDossierTraitsSection } from './NpcDossierTraitsSection'
import { baseDossier, collectText } from './npcDossierTestUtils'

describe('NpcDossierTraitsSection speaking vs non-speaking', () => {
  it('shows identity labels for a speaking NPC', () => {
    const dossier = baseDossier({ canSpeak: true })
    const tree = NpcDossierTraitsSection({
      traits: dossier.traits,
      canSpeak: dossier.canSpeak
    })
    const text = collectText(tree).join(' ')
    expect(text).toContain('Temperament')
    expect(text).toContain('Friendly')
    expect(text).toContain('Role')
    expect(text).toContain('innkeeper')
    expect(text).toContain('Race')
    expect(text).toContain('Human')
    expect(text).not.toContain('Non-verbal')
  })

  it('shows Speech: Non-verbal for non-speaking NPCs', () => {
    const dossier = baseDossier({ canSpeak: false })
    const tree = NpcDossierTraitsSection({
      traits: dossier.traits,
      canSpeak: dossier.canSpeak
    })
    const text = collectText(tree).join(' ')
    expect(text).toContain('Speech')
    expect(text).toContain('Non-verbal')
  })
})

describe('NpcDossierTraitsSection null identity keys', () => {
  it('shows empty placeholder for null optional identity keys', () => {
    const dossier = baseDossier({
      traits: {
        temperament: 'cautious',
        raceKey: null,
        alignment: null,
        genderKey: null,
        classKey: null,
        backgroundKey: null,
        role: 'wolf'
      }
    })
    const tree = NpcDossierTraitsSection({
      traits: dossier.traits,
      canSpeak: dossier.canSpeak
    })
    const text = collectText(tree).join(' ')
    expect(text).toContain('Race')
    expect(text).toContain('—')
    expect(text).toContain('Alignment')
    expect(text).toContain('Gender')
    expect(text).toContain('Class')
    expect(text).toContain('Background')
    expect(text).toContain('Cautious')
    expect(text).toContain('wolf')
  })
})

describe('NpcDossierDispositionSection', () => {
  it('shows the disposition string', () => {
    const tree = NpcDossierDispositionSection({ disposition: 'warm toward the party' })
    const text = collectText(tree).join(' ')
    expect(text).toContain('Disposition')
    expect(text).toContain('warm toward the party')
  })

  it('shows empty state for blank disposition', () => {
    const tree = NpcDossierDispositionSection({ disposition: '' })
    const text = collectText(tree).join(' ')
    expect(text).toContain('No disposition recorded yet')
  })
})
