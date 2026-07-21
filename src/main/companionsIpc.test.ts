import { describe, expect, it } from 'vitest'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { applyStartingLoadout } from '../db/repositories/startingLoadout'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCampaignRace } from '../db/repositories/campaignRaces'
import {
  createCharacter,
  getCharacterById,
  listCharactersByCampaign,
  listPartyMembersForPlayer
} from '../db/repositories/characters'
import { setGuidedCreationPhase } from '../db/repositories/guidedCreation'
import { findCatalogItemByName } from '../db/repositories/items'
import type { CompanionPreviewDto } from '../shared/partyMembers/types'
import type { RaceLore } from '../shared/raceSelection/types'
import { createPartyMembers } from './characterCreationIpc'
import { kickoffIdentityInterviewIfNeeded } from './guidedCreationIdentity'
import {
  acceptCompanionPreview,
  generateCompanionPreviewForCharacter,
  listCompanionRosterForPlayer,
  setCompanionOrder
} from './companionsIpc'

const ELF_LORE: RaceLore = {
  summary: 'Elves guard the mistwood.',
  appearance: 'Pale and tall.',
  culture: 'Reclusive.',
  roleInThisLand: 'Wardens.',
  hooks: ['A grove dies.']
}

const VALID_PROPOSAL = JSON.stringify({
  name: 'Bryn',
  characterClass: 'ranger',
  personality: 'Quiet scout who watches the treeline.',
  raceKey: 'elf',
  role: 'scout',
  appearance: { hairColor: 'auburn', age: 'young adult', eyeColor: 'green' },
  inventoryItemIds: ['item-unknown'],
  abilityScores: { body: 20, agility: 3, mind: 99 }
})

function seedCompanionsPlayer(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'M',
    premisePrompt: 'A realm.',
    deathMode: 'legendary'
  })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Asha',
    characterClass: 'fighter',
    kind: 'player',
    guidedCreationPhase: 'equipment',
    raceKey: 'human',
    backgroundKey: 'soldier',
    stats: { abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 } }
  })
  applyStartingLoadout(db, player.id, {
    weaponName: 'Longsword',
    armorName: 'Chain Hauberk',
    offHandChoice: 'Wooden Shield',
    spellKeys: ['rallying-strike']
  })
  setGuidedCreationPhase(db, player.id, 'companions')
  createCampaignRace(db, {
    campaignId: campaign.id,
    raceKey: 'elf',
    kind: 'preset',
    label: 'Elf',
    seedPrompt: 'Graceful.',
    lore: ELF_LORE
  })
  return { campaign, player }
}

function buildPreview(
  playerId: string,
  inventoryItemIds: string[] = []
): CompanionPreviewDto {
  return {
    name: 'Bryn',
    characterClass: 'ranger',
    personality: 'Quiet scout.',
    raceKey: 'elf',
    role: 'scout',
    appearance: { hairColor: 'auburn', age: 'young adult', eyeColor: 'green' },
    inventoryItemIds,
    ownerPlayerCharacterId: playerId,
    pcContextDigest: 'Asha · human · soldier · fighter'
  }
}

describe('generateCompanionPreviewForCharacter success', () => {
  it('returns a clamped preview without persisting roster rows', async () => {
    const db = createTestDb()
    const { campaign, player } = seedCompanionsPlayer(db)
    const provider = createScriptedProvider([VALID_PROPOSAL])
    const preview = await generateCompanionPreviewForCharacter(db, provider, {
      campaignId: campaign.id,
      characterId: player.id,
      prompt: 'A quiet elven scout.'
    })
    expect(preview.name).toBe('Bryn')
    expect(preview.raceKey).toBe('elf')
    expect(preview.ownerPlayerCharacterId).toBe(player.id)
    expect(listCharactersByCampaign(db, campaign.id).filter((c) => c.kind === 'ai_party_member')).toHaveLength(0)
    expect(provider.calls[0]?.context?.purpose).toBe('onboarding.companion_generate')
  })

  it('includes PC race, background, and gear summary in the agent prompt', async () => {
    const db = createTestDb()
    const { campaign, player } = seedCompanionsPlayer(db)
    const provider = createScriptedProvider([VALID_PROPOSAL])
    await generateCompanionPreviewForCharacter(db, provider, {
      campaignId: campaign.id,
      characterId: player.id,
      prompt: 'Watch my back.'
    })
    const prompt = provider.calls[0]?.prompt ?? ''
    expect(prompt).toContain('Asha')
    expect(prompt).toContain('human')
    expect(prompt).toContain('soldier')
    expect(prompt).toContain('Longsword')
    expect(prompt).toContain('Watch my back.')
  })
})

describe('generateCompanionPreviewForCharacter race normalization', () => {
  it('rewrites unknown race keys to human in the preview', async () => {
    const db = createTestDb()
    const { campaign, player } = seedCompanionsPlayer(db)
    const provider = createScriptedProvider([
      JSON.stringify({
        name: 'Kai',
        characterClass: 'rogue',
        personality: 'Sly',
        raceKey: 'dragon-god'
      })
    ])
    const preview = await generateCompanionPreviewForCharacter(db, provider, {
      campaignId: campaign.id,
      characterId: player.id,
      prompt: 'A sly friend.'
    })
    expect(preview.raceKey).toBe('human')
  })
})

describe('generateCompanionPreviewForCharacter validation', () => {
  it('rejects generate when not in companions phase', async () => {
    const db = createTestDb()
    const { campaign, player } = seedCompanionsPlayer(db)
    setGuidedCreationPhase(db, player.id, 'equipment')
    const provider = createScriptedProvider([VALID_PROPOSAL])
    await expect(
      generateCompanionPreviewForCharacter(db, provider, {
        campaignId: campaign.id,
        characterId: player.id,
        prompt: 'test'
      })
    ).rejects.toThrow('invalid_phase')
  })
})

describe('acceptCompanionPreview success', () => {
  it('persists an owned companion and advances to identity', async () => {
    const db = createTestDb()
    const { campaign, player } = seedCompanionsPlayer(db)
    const provider = createScriptedProvider([])
    const preview = buildPreview(player.id)
    const result = await acceptCompanionPreview(db, provider, {
      campaignId: campaign.id,
      characterId: player.id,
      preview
    })
    expect(result).toEqual({ ok: true })
    expect(getCharacterById(db, player.id)?.guidedCreationPhase).toBe('identity')
    const roster = listPartyMembersForPlayer(db, player.id)
    expect(roster).toHaveLength(1)
    const member = roster[0]
    expect(member?.name).toBe('Bryn')
    expect(member?.ownerPlayerCharacterId).toBe(player.id)
    const stats = member?.stats as Record<string, unknown> | undefined
    expect(stats?.companionRole).toBe('scout')
  })

  it('grants preview inventory catalog items when ids are valid', async () => {
    const db = createTestDb()
    const { campaign, player } = seedCompanionsPlayer(db)
    const dagger = findCatalogItemByName(db, 'Dagger')!
    const provider = createScriptedProvider([])
    const preview = buildPreview(player.id, [dagger.id])
    await acceptCompanionPreview(db, provider, {
      campaignId: campaign.id,
      characterId: player.id,
      preview
    })
    const member = listPartyMembersForPlayer(db, player.id)[0]
    const { listCharacterItems } = await import('../db/repositories/characterItems')
    const items = listCharacterItems(db, member!.id)
    expect(items.some((row) => row.itemId === dagger.id)).toBe(true)
  })
})

describe('acceptCompanionPreview rejection', () => {
  it('rejects accept when roster already has a companion (max 1)', async () => {
    const db = createTestDb()
    const { campaign, player } = seedCompanionsPlayer(db)
    const provider = createScriptedProvider([])
    await createPartyMembers(db, provider, {
      campaignId: campaign.id,
      ownerPlayerCharacterId: player.id,
      members: [
        {
          name: 'Existing',
          characterClass: 'fighter',
          personality: 'Already here.',
          raceKey: 'elf'
        }
      ]
    })
    const result = await acceptCompanionPreview(db, provider, {
      campaignId: campaign.id,
      characterId: player.id,
      preview: buildPreview(player.id)
    })
    expect(result).toEqual({ ok: false, reason: 'roster_full' })
  })

  it('rejects accept when preview owner does not match player', async () => {
    const db = createTestDb()
    const { campaign, player } = seedCompanionsPlayer(db)
    const provider = createScriptedProvider([])
    const result = await acceptCompanionPreview(db, provider, {
      campaignId: campaign.id,
      characterId: player.id,
      preview: buildPreview('wrong-owner')
    })
    expect(result).toEqual({ ok: false, reason: 'invalid_preview' })
  })
})

describe('identity kickoff with companion digest', () => {
  it('includes companion name in kickoff systemPrompt when roster is non-empty', async () => {
    const db = createTestDb()
    const { campaign, player } = seedCompanionsPlayer(db)
    const provider = createScriptedProvider([
      JSON.stringify({ dmReply: 'Who are you, and who is Bryn to you?' })
    ])
    await acceptCompanionPreview(db, provider, {
      campaignId: campaign.id,
      characterId: player.id,
      preview: buildPreview(player.id)
    })
    await kickoffIdentityInterviewIfNeeded(db, provider, {
      campaignId: campaign.id,
      characterId: player.id
    })
    expect(provider.calls.at(-1)?.context?.systemPrompt).toContain('Bryn')
    expect(provider.calls.at(-1)?.context?.systemPrompt).toContain('scout')
  })
})

describe('setCompanionOrder', () => {
  it('writes companionOrder to stats and clears when text is empty', async () => {
    const db = createTestDb()
    const { campaign, player } = seedCompanionsPlayer(db)
    const provider = createScriptedProvider([])
    await acceptCompanionPreview(db, provider, {
      campaignId: campaign.id,
      characterId: player.id,
      preview: buildPreview(player.id)
    })
    const member = listPartyMembersForPlayer(db, player.id)[0]!
    const setResult = setCompanionOrder(db, {
      companionId: member.id,
      text: 'Hold the doorway'
    })
    expect(setResult).toEqual({ ok: true })
    const stats = getCharacterById(db, member.id)?.stats as Record<string, unknown>
    const order = stats.companionOrder as { text: string }
    expect(order.text).toBe('Hold the doorway')
    setCompanionOrder(db, { companionId: member.id, text: '   ' })
    const cleared = getCharacterById(db, member.id)?.stats as Record<string, unknown>
    expect(cleared.companionOrder).toBeUndefined()
  })

  it('rejects non-companion characters', () => {
    const db = createTestDb()
    const { player } = seedCompanionsPlayer(db)
    expect(setCompanionOrder(db, { companionId: player.id, text: 'test' })).toEqual({
      ok: false,
      reason: 'not_companion'
    })
  })
})

describe('listCompanionRosterForPlayer', () => {
  it('returns roster rows with role and order text', async () => {
    const db = createTestDb()
    const { campaign, player } = seedCompanionsPlayer(db)
    const provider = createScriptedProvider([])
    await acceptCompanionPreview(db, provider, {
      campaignId: campaign.id,
      characterId: player.id,
      preview: buildPreview(player.id)
    })
    const member = listPartyMembersForPlayer(db, player.id)[0]!
    setCompanionOrder(db, { companionId: member.id, text: 'Watch the flank' })
    const roster = listCompanionRosterForPlayer(db, { playerCharacterId: player.id })
    expect(roster).toHaveLength(1)
    expect(roster[0]?.name).toBe('Bryn')
    expect(roster[0]?.role).toBe('scout')
    expect(roster[0]?.orderText).toBe('Watch the flank')
  })

  it('returns an empty roster when the player has no companions', () => {
    const db = createTestDb()
    const { player } = seedCompanionsPlayer(db)
    expect(listCompanionRosterForPlayer(db, { playerCharacterId: player.id })).toEqual([])
  })
})
