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

describe('NpcDossierTraitsSection appearance traits when set', () => {
  it('shows hair, age, and eyes when set', () => {
    const dossier = baseDossier({
      traits: {
        temperament: 'friendly',
        raceKey: 'human',
        alignment: 'neutral_good',
        genderKey: 'woman',
        classKey: 'fighter',
        backgroundKey: 'soldier',
        role: 'innkeeper',
        hairColor: 'auburn',
        age: 'middle-aged',
        eyeColor: 'green',
        silhouette: null,
        sizeClass: null,
        primaryColors: [],
        distinguishingMarks: null,
        textureOrMaterial: null
      }
    })
    const tree = NpcDossierTraitsSection({
      traits: dossier.traits,
      canSpeak: dossier.canSpeak
    })
    const text = collectText(tree).join(' ')
    expect(text).toContain('Hair')
    expect(text).toContain('auburn')
    expect(text).toContain('Age')
    expect(text).toContain('middle-aged')
    expect(text).toContain('Eyes')
    expect(text).toContain('green')
  })
})

describe('NpcDossierTraitsSection appearance traits when null', () => {
  it('shows empty placeholder for null appearance traits', () => {
    const dossier = baseDossier({
      traits: {
        temperament: 'friendly',
        raceKey: 'human',
        alignment: 'neutral_good',
        genderKey: 'woman',
        classKey: 'fighter',
        backgroundKey: 'soldier',
        role: 'innkeeper',
        hairColor: null,
        age: null,
        eyeColor: null,
        silhouette: null,
        sizeClass: null,
        primaryColors: [],
        distinguishingMarks: null,
        textureOrMaterial: null
      }
    })
    const tree = NpcDossierTraitsSection({
      traits: dossier.traits,
      canSpeak: dossier.canSpeak
    })
    const text = collectText(tree).join(' ')
    expect(text).toContain('Hair')
    expect(text).toContain('Age')
    expect(text).toContain('Eyes')
    expect(text.match(/—/g)?.length).toBeGreaterThanOrEqual(3)
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
        role: 'wolf',
        hairColor: null,
        age: null,
        eyeColor: null,
        silhouette: null,
        sizeClass: null,
        primaryColors: [],
        distinguishingMarks: null,
        textureOrMaterial: null
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

describe('NpcDossierTraitsSection species appearance when present', () => {
  it('shows species appearance rows when present', () => {
    const dossier = baseDossier({
      canSpeak: false,
      traits: {
        temperament: 'aggressive',
        raceKey: null,
        alignment: null,
        genderKey: null,
        classKey: null,
        backgroundKey: null,
        role: 'hostile',
        hairColor: null,
        age: null,
        eyeColor: null,
        silhouette: 'quadruped wolf-like',
        sizeClass: 'large',
        primaryColors: ['violet', 'charcoal'],
        distinguishingMarks: 'planar scars',
        textureOrMaterial: 'crackling fur'
      }
    })
    const tree = NpcDossierTraitsSection({
      traits: dossier.traits,
      canSpeak: dossier.canSpeak
    })
    const text = collectText(tree).join(' ')
    expect(text).toContain('Silhouette')
    expect(text).toContain('quadruped wolf-like')
    expect(text).toContain('Size')
    expect(text).toContain('large')
    expect(text).toContain('Colors')
    expect(text).toContain('violet, charcoal')
    expect(text).toContain('Marks')
    expect(text).toContain('planar scars')
    expect(text).toContain('Texture')
    expect(text).toContain('crackling fur')
  })
})

describe('NpcDossierTraitsSection species appearance when empty', () => {
  it('omits species appearance rows when empty', () => {
    const dossier = baseDossier({
      canSpeak: false,
      traits: {
        temperament: 'aggressive',
        raceKey: null,
        alignment: null,
        genderKey: null,
        classKey: null,
        backgroundKey: null,
        role: 'hostile',
        hairColor: null,
        age: null,
        eyeColor: null,
        silhouette: null,
        sizeClass: null,
        primaryColors: [],
        distinguishingMarks: null,
        textureOrMaterial: null
      }
    })
    const tree = NpcDossierTraitsSection({
      traits: dossier.traits,
      canSpeak: dossier.canSpeak
    })
    const text = collectText(tree).join(' ')
    expect(text).not.toContain('Silhouette')
    expect(text).not.toContain('Colors')
    expect(text).not.toContain('Texture')
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
