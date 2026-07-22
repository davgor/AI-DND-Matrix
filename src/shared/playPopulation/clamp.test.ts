import { describe, expect, it } from 'vitest'
import { clampNpcProposals, clampPlaceProposals } from './clamp'
import { findExistingNpcForProposal, findExistingRegionForProposal } from './idempotency'
import { namesMatch, slugifyLabel } from './slug'
import { isValidNpcProposal, isValidPlaceProposal } from './validate'
import { MAX_NPC_PROPOSALS_PER_TURN, MAX_PLACE_PROPOSALS_PER_TURN } from './types'
import { createTestDb } from '../../db/testUtils'
import { createCampaign } from '../../db/repositories/campaigns'
import { createNpc } from '../../db/repositories/npcs'
import { createRegion } from '../../db/repositories/regions'

const placeProposal = {
  key: 'mistwood-hamlet',
  name: 'Mistwood Hamlet',
  description: 'A nameless cluster of cottages.'
}

const speakingProposal = {
  key: 'barkeep-tom',
  name: 'Tom',
  role: 'barkeeper',
  disposition: 'gruff but fair',
  raceKey: 'human',
  genderKey: 'man',
  classKey: 'commoner',
  alignment: 'true_neutral',
  backstory: 'Runs the taproom.'
}

describe('slugifyLabel + namesMatch', () => {
  it('slugifies labels for key lookup', () => {
    expect(slugifyLabel('Barkeep Tom')).toBe('barkeep-tom')
  })

  it('matches names case-insensitively', () => {
    expect(namesMatch('Tom', 'tom')).toBe(true)
    expect(namesMatch('Tom', 'Tina')).toBe(false)
  })
})

describe('isValidNpcProposal', () => {
  it('accepts a speaking NPC with identity bundle', () => {
    expect(isValidNpcProposal(speakingProposal)).toBe(true)
  })

  it('rejects speaking NPC missing identity bundle fields', () => {
    expect(isValidNpcProposal({ ...speakingProposal, raceKey: undefined })).toBe(false)
  })

  it('accepts non-speaking NPC without identity bundle', () => {
    expect(
      isValidNpcProposal({
        name: 'Raven',
        role: 'scavenger bird',
        disposition: 'skittish',
        canSpeak: false
      })
    ).toBe(true)
  })
})

describe('clampNpcProposals', () => {
  it(`keeps at most ${MAX_NPC_PROPOSALS_PER_TURN} valid proposals`, () => {
    const third = { ...speakingProposal, key: 'npc-3', name: 'Uma' }
    const fourth = { ...speakingProposal, key: 'npc-4', name: 'Vera' }
    const clamped = clampNpcProposals([
      speakingProposal,
      { ...speakingProposal, key: 'npc-2', name: 'Sam' },
      third,
      fourth,
      { name: 'bad' }
    ])
    expect(clamped).toHaveLength(MAX_NPC_PROPOSALS_PER_TURN)
    expect(clamped[0]?.name).toBe('Tom')
    expect(clamped[1]?.name).toBe('Sam')
  })

  it('drops invalid entries without counting them toward the cap', () => {
    const clamped = clampNpcProposals([
      { name: 'incomplete' },
      speakingProposal,
      { ...speakingProposal, key: 'npc-2', name: 'Sam' },
      { ...speakingProposal, key: 'npc-3', name: 'Uma' }
    ])
    expect(clamped).toHaveLength(2)
  })
})

describe('findExistingNpcForProposal', () => {
  it('matches by name in region and by campaign key slug', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Tavern',
      premisePrompt: 'Drinks',
      deathMode: 'legendary'
    })
    const region = createRegion(db, {
      campaignId: campaign.id,
      name: 'Harbor',
      description: 'Docks'
    })
    const tom = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Tom',
      role: 'barkeeper',
      disposition: 'gruff'
    })

    expect(
      findExistingNpcForProposal(db, campaign.id, region.id, {
        name: 'tom',
        key: 'other-key'
      })?.id
    ).toBe(tom.id)

    expect(
      findExistingNpcForProposal(db, campaign.id, region.id, {
        name: 'New Name',
        key: 'tom'
      })?.id
    ).toBe(tom.id)
  })
})

describe('isValidPlaceProposal', () => {
  it('accepts key, name, and description', () => {
    expect(isValidPlaceProposal(placeProposal)).toBe(true)
  })

  it('rejects incomplete place proposals', () => {
    expect(isValidPlaceProposal({ key: 'x', name: 'Y' })).toBe(false)
    expect(isValidPlaceProposal({ name: 'Y', description: 'd' })).toBe(false)
  })
})

describe('clampPlaceProposals', () => {
  it(`keeps at most ${MAX_PLACE_PROPOSALS_PER_TURN} valid proposals`, () => {
    const clamped = clampPlaceProposals([
      placeProposal,
      { key: 'ford-camp', name: 'Ford Camp', description: 'Tents.' },
      { key: 'ridge-watch', name: 'Ridge Watch', description: 'Lookout.' },
      { key: 'bad' }
    ])
    expect(clamped).toHaveLength(MAX_PLACE_PROPOSALS_PER_TURN)
    expect(clamped[0]?.name).toBe('Mistwood Hamlet')
    expect(clamped[1]?.name).toBe('Ford Camp')
  })
})

describe('findExistingRegionForProposal', () => {
  it('matches by campaign name and by key slug', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Roads',
      premisePrompt: 'Travel',
      deathMode: 'legendary'
    })
    const hamlet = createRegion(db, {
      campaignId: campaign.id,
      name: 'Mistwood Hamlet',
      description: 'Cottages'
    })

    expect(
      findExistingRegionForProposal(db, campaign.id, {
        name: 'mistwood hamlet',
        key: 'other-key'
      })?.id
    ).toBe(hamlet.id)

    expect(
      findExistingRegionForProposal(db, campaign.id, {
        name: 'New Name',
        key: 'mistwood-hamlet'
      })?.id
    ).toBe(hamlet.id)
  })
})
