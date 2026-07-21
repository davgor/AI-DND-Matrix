import { describe, expect, it } from 'vitest'
import type { Npc } from '../../../db/repositories/npcs'
import { CampaignReviewNpcTraits } from './CampaignReviewNpcTraits'

function isJsxElement(node: unknown): node is JSX.Element {
  return typeof node === 'object' && node !== null && 'props' in node
}

function collectText(node: unknown): string[] {
  if (typeof node === 'string') {
    return [node]
  }
  if (!isJsxElement(node)) {
    return []
  }
  const children = node.props.children
  if (children === undefined) {
    return []
  }
  if (Array.isArray(children)) {
    return children.flatMap((child) => collectText(child))
  }
  return collectText(children)
}

function baseNpc(overrides: Partial<Npc> = {}): Npc {
  return {
    id: 'npc-1',
    campaignId: 'camp-1',
    regionId: 'region-1',
    name: 'Veteran',
    role: 'innkeeper',
    disposition: 'gruff',
    alignment: 'lawful_neutral',
    temperament: 'cautious',
    canSpeak: true,
    status: { alive: true },
    isPartyMember: false,
    backstory: 'Served in the border wars.',
    combatTier: 'villager',
    retiredAdventurerProfile: null,
    hp: 8,
    maxHp: 8,
    ac: 10,
    attackBonus: 0,
    damageRoll: null,
    conditions: [],
    catalogCreatureKey: null,
    encounterOutcome: null,
    raceKey: 'human',
    backgroundKey: null,
    genderKey: null,
    classKey: null,
    speakingStyleSpecimen: null,
    speakingStyleExamples: null,
    bestiarySpeciesId: null,
    bestiaryVariantKey: null,
    ...overrides
  } as Npc
}

describe('CampaignReviewNpcTraits background row (051.6)', () => {
  it('shows Background when the NPC has a backgroundKey', () => {
    const tree = CampaignReviewNpcTraits({ npc: baseNpc({ backgroundKey: 'soldier' }) })
    const text = collectText(tree).join(' ')
    expect(text).toContain('Background')
    expect(text).toContain('Soldier')
  })

  it('hides Background when backgroundKey is null', () => {
    const tree = CampaignReviewNpcTraits({ npc: baseNpc({ backgroundKey: null }) })
    const text = collectText(tree).join(' ')
    expect(text).not.toContain('Background')
  })
})

describe('CampaignReviewNpcTraits gender/class rows (052.8)', () => {
  it('shows Gender and Class when set', () => {
    const tree = CampaignReviewNpcTraits({
      npc: baseNpc({ genderKey: 'woman', classKey: 'fighter' })
    })
    const text = collectText(tree).join(' ')
    expect(text).toContain('Gender')
    expect(text).toContain('Woman')
    expect(text).toContain('Class')
    expect(text).toContain('Fighter')
  })

  it('hides Gender and Class for legacy NPCs with null keys', () => {
    const tree = CampaignReviewNpcTraits({ npc: baseNpc({ genderKey: null, classKey: null }) })
    const text = collectText(tree).join(' ')
    expect(text).not.toContain('Gender')
    expect(text).not.toContain('Class')
  })
})

describe('CampaignReviewNpcTraits appearance rows (121.2)', () => {
  it('shows hair, age, and eyes when set', () => {
    const tree = CampaignReviewNpcTraits({
      npc: baseNpc({ hairColor: 'auburn', age: 'middle-aged', eyeColor: 'green' })
    })
    const text = collectText(tree).join(' ')
    expect(text).toContain('Hair')
    expect(text).toContain('auburn')
    expect(text).toContain('Age')
    expect(text).toContain('middle-aged')
    expect(text).toContain('Eyes')
    expect(text).toContain('green')
  })

  it('hides appearance rows when unset', () => {
    const tree = CampaignReviewNpcTraits({
      npc: baseNpc({ hairColor: null, age: null, eyeColor: null })
    })
    const text = collectText(tree).join(' ')
    expect(text).not.toContain('Hair')
    expect(text).not.toContain('Age')
    expect(text).not.toContain('Eyes')
  })
})

describe('CampaignReviewNpcTraits race row (068)', () => {
  it('shows Race when the NPC has a raceKey', () => {
    const tree = CampaignReviewNpcTraits({ npc: baseNpc({ raceKey: 'human' }) })
    const text = collectText(tree).join(' ')
    expect(text).toContain('Race')
    expect(text).toContain('Human')
  })

  it('hides Race when raceKey is null', () => {
    const tree = CampaignReviewNpcTraits({ npc: baseNpc({ raceKey: null }) })
    const text = collectText(tree).join(' ')
    expect(text).not.toContain('Race')
  })

  it('uses campaign catalog label for custom races', () => {
    const tree = CampaignReviewNpcTraits({
      npc: baseNpc({ raceKey: 'custom_ashwalkers' }),
      campaignRaces: [
        {
          id: 'cr-1',
          campaignId: 'camp-1',
          raceKey: 'custom_ashwalkers',
          kind: 'custom',
          label: 'Ashwalker',
          seedPrompt: 'Desert folk.',
          lore: {
            summary: 'Desert folk.',
            appearance: 'Ash-streaked.',
            culture: 'Nomadic.',
            roleInThisLand: 'Scouts.',
            hooks: ['Trade route']
          },
          createdByCharacterId: null,
          createdAt: '2026-01-01T00:00:00.000Z'
        }
      ]
    })
    const text = collectText(tree).join(' ')
    expect(text).toContain('Race')
    expect(text).toContain('Ashwalker')
  })
})
