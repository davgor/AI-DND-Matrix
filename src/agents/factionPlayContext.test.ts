import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import {
  createCampaign,
  updateCampaignFactionPressure
} from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createDeity } from '../db/repositories/deities'
import {
  applyCharacterFactionReputationDelta,
  createFaction,
  createFactionRelation
} from '../db/repositories/factions'
import { createNpc } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import {
  FACTION_DIGEST_ENRICHED_MAX_LINES,
  FACTION_DIGEST_LINE_MAX_CHARS,
  FACTION_DIGEST_SLIM_MAX_LINES,
  FACTION_RELATION_DIGEST_ENRICHED_MAX,
  FACTION_RELATION_DIGEST_SLIM_MAX,
  FACTION_REPUTATION_DIGEST_MAX,
  type Faction
} from '../shared/factions'
import {
  buildDmFactionPlayPromptSection,
  detectFactionPlayTags,
  loadDmFactionPlayContext,
  loadNpcFactionStandingLine,
  shouldIncludePantheonDigest
} from './factionPlayContext'

function seedPlayWorld() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Play Factions',
    premisePrompt: 'Harbor courts',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Harbor',
    description: 'Busy docks'
  })
  const character = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    characterClass: 'fighter',
    kind: 'player',
    stats: { currentRegionId: region.id }
  })
  const deity = createDeity(db, {
    campaignId: campaign.id,
    name: 'Vhalor',
    epithet: 'the Drowned Judge',
    domains: ['tides', 'oaths'],
    tenets: ['Keep oaths'],
    blurb: 'Tide judge.',
    isForgotten: false,
    sortOrder: 0
  })
  return { db, campaign, region, character, deity }
}

function seedFactionRoster(
  db: ReturnType<typeof createTestDb>,
  campaignId: string,
  deityId: string,
  count: number
): Faction[] {
  return Array.from({ length: count }, (_, i) =>
    createFaction(db, {
      campaignId,
      key: `bloc-${i}`,
      name: `Bloc ${i}`,
      kind: i === 0 ? 'religious' : 'civic',
      summary: `Summary for bloc ${i} that should only appear when enriched.`,
      deityId: i === 0 ? deityId : null,
      sortOrder: i,
      source: 'campaign_create'
    })
  )
}

function seedChainRelations(input: {
  db: ReturnType<typeof createTestDb>
  campaignId: string
  factions: Faction[]
  edgeCount: number
  stance: 'rival' | 'tense'
}): void {
  for (let i = 0; i < input.edgeCount; i++) {
    createFactionRelation(input.db, {
      campaignId: input.campaignId,
      factionAId: input.factions[i]!.id,
      factionBId: input.factions[i + 1]!.id,
      stance: input.stance,
      summary: input.stance === 'rival' ? 'Feud line' : 'Court tension'
    })
  }
}

function expectSlimFactionDigest(
  ctx: NonNullable<Awaited<ReturnType<typeof loadDmFactionPlayContext>>>
): void {
  expect(ctx.enriched).toBe(false)
  expect(ctx.includePantheon).toBe(false)
  expect(ctx.factionLines).toHaveLength(FACTION_DIGEST_SLIM_MAX_LINES)
  expect(ctx.relationLines).toHaveLength(FACTION_RELATION_DIGEST_SLIM_MAX)
  expect(ctx.reputationLines.length).toBeLessThanOrEqual(FACTION_REPUTATION_DIGEST_MAX)
  expect(ctx.pantheonLines).toEqual([])
  expect(ctx.factionLines.every((line) => !line.includes('Summary for bloc'))).toBe(true)
  expect(ctx.factionLines.every((line) => line.length <= FACTION_DIGEST_LINE_MAX_CHARS)).toBe(true)
}

describe('detectFactionPlayTags', () => {
  it('tags faith/divine player input', () => {
    expect(detectFactionPlayTags('I pray at the temple shrine').faithTagged).toBe(true)
    expect(detectFactionPlayTags('I pray at the temple shrine').intrigueOrFaithTagged).toBe(true)
  })

  it('tags intrigue player input without faith', () => {
    const tags = detectFactionPlayTags('I ask the guild about court intrigue and rivals')
    expect(tags.intrigueTagged).toBe(true)
    expect(tags.faithTagged).toBe(false)
    expect(tags.intrigueOrFaithTagged).toBe(true)
  })

  it('leaves ordinary exploration untagged', () => {
    const tags = detectFactionPlayTags('I walk to the market and buy bread')
    expect(tags.intrigueOrFaithTagged).toBe(false)
    expect(tags.faithTagged).toBe(false)
  })
})

describe('shouldIncludePantheonDigest', () => {
  it('includes pantheon on heavy pressure even without faith tags', () => {
    expect(
      shouldIncludePantheonDigest({
        pressure: 'heavy',
        intrigueOrFaithTagged: false,
        faithOrDivineRelevant: false
      })
    ).toBe(true)
  })

  it('includes pantheon when enriched and faith/divine relevant', () => {
    expect(
      shouldIncludePantheonDigest({
        pressure: 'light',
        intrigueOrFaithTagged: true,
        faithOrDivineRelevant: true
      })
    ).toBe(true)
  })

  it('omits pantheon for intrigue-only enrichment under light pressure', () => {
    expect(
      shouldIncludePantheonDigest({
        pressure: 'light',
        intrigueOrFaithTagged: true,
        faithOrDivineRelevant: false
      })
    ).toBe(false)
  })

  it('omits pantheon on default slim path', () => {
    expect(
      shouldIncludePantheonDigest({
        pressure: 'medium',
        intrigueOrFaithTagged: false,
        faithOrDivineRelevant: false
      })
    ).toBe(false)
  })
})

describe('loadDmFactionPlayContext empty', () => {
  it('returns null when the campaign has no factions', () => {
    const { db, campaign, character } = seedPlayWorld()
    expect(
      loadDmFactionPlayContext(db, {
        campaignId: campaign.id,
        characterId: character.id,
        playerInput: 'I look around'
      })
    ).toBeNull()
  })
})

describe('loadDmFactionPlayContext slim', () => {
  it('stays within 040 digest caps and omits pantheon', () => {
    const { db, campaign, character, deity } = seedPlayWorld()
    updateCampaignFactionPressure(db, campaign.id, 'light')
    const factions = seedFactionRoster(db, campaign.id, deity.id, 8)
    seedChainRelations({ db, campaignId: campaign.id, factions, edgeCount: 6, stance: 'rival' })
    applyCharacterFactionReputationDelta(db, {
      characterId: character.id,
      factionId: factions[0]!.id,
      delta: 40,
      reason: 'helped'
    })
    const ctx = loadDmFactionPlayContext(db, {
      campaignId: campaign.id,
      characterId: character.id,
      playerInput: 'I walk to the market'
    })
    expect(ctx).not.toBeNull()
    expectSlimFactionDigest(ctx!)
    const section = buildDmFactionPlayPromptSection(ctx!)
    expect(section).toContain('Faction digest')
    expect(section).not.toContain('Pantheon digest')
    expect(section).not.toContain('Summary for bloc')
  })
})

describe('loadDmFactionPlayContext intrigue', () => {
  it('enriches under light pressure without pantheon', () => {
    const { db, campaign, character, deity } = seedPlayWorld()
    updateCampaignFactionPressure(db, campaign.id, 'light')
    const factions = seedFactionRoster(db, campaign.id, deity.id, 12)
    seedChainRelations({
      db,
      campaignId: campaign.id,
      factions,
      edgeCount: 10,
      stance: 'tense'
    })
    const ctx = loadDmFactionPlayContext(db, {
      campaignId: campaign.id,
      characterId: character.id,
      playerInput: 'I probe the guild for court intrigue'
    })
    expect(ctx!.enriched).toBe(true)
    expect(ctx!.includePantheon).toBe(false)
    expect(ctx!.factionLines).toHaveLength(FACTION_DIGEST_ENRICHED_MAX_LINES)
    expect(ctx!.relationLines).toHaveLength(FACTION_RELATION_DIGEST_ENRICHED_MAX)
    expect(ctx!.factionLines[0]).toContain('Summary for bloc')
    expect(ctx!.pantheonLines).toEqual([])
  })
})

describe('loadDmFactionPlayContext faith', () => {
  it('enriches and includes compact pantheon when faith-tagged', () => {
    const { db, campaign, character, deity } = seedPlayWorld()
    updateCampaignFactionPressure(db, campaign.id, 'medium')
    seedFactionRoster(db, campaign.id, deity.id, 3)
    const ctx = loadDmFactionPlayContext(db, {
      campaignId: campaign.id,
      characterId: character.id,
      playerInput: 'I ask the priest about the drowned god'
    })
    expect(ctx!.enriched).toBe(true)
    expect(ctx!.includePantheon).toBe(true)
    expect(ctx!.pantheonLines.some((line) => line.includes('Vhalor'))).toBe(true)
    expect(ctx!.pantheonLines.some((line) => line.includes('tides'))).toBe(true)
    expect(ctx!.pantheonLines.every((line) => !line.includes('Keep oaths'))).toBe(true)
    expect(ctx!.pantheonLines.every((line) => line.length <= FACTION_DIGEST_LINE_MAX_CHARS)).toBe(
      true
    )
    expect(buildDmFactionPlayPromptSection(ctx!)).toContain('Pantheon digest')
  })
})

describe('loadDmFactionPlayContext heavy', () => {
  it('includes pantheon on heavy pressure without faith tags', () => {
    const { db, campaign, character, deity } = seedPlayWorld()
    updateCampaignFactionPressure(db, campaign.id, 'heavy')
    seedFactionRoster(db, campaign.id, deity.id, 6)
    const ctx = loadDmFactionPlayContext(db, {
      campaignId: campaign.id,
      characterId: character.id,
      playerInput: 'I look around the square'
    })
    expect(ctx!.enriched).toBe(true)
    expect(ctx!.includePantheon).toBe(true)
    expect(ctx!.pantheonLines.some((line) => line.includes('Vhalor'))).toBe(true)
  })
})

describe('loadNpcFactionStandingLine none', () => {
  it('returns undefined when the NPC has no faction', () => {
    const { db, campaign, region, character } = seedPlayWorld()
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Wanderer',
      role: 'traveler',
      disposition: 'neutral',
      temperament: 'neutral',
      canSpeak: true
    })
    expect(loadNpcFactionStandingLine(db, { npc, characterId: character.id })).toBeUndefined()
  })
})

describe('loadNpcFactionStandingLine neutral', () => {
  it('defaults missing reputation to neutral', () => {
    const { db, campaign, region, character } = seedPlayWorld()
    const faction = createFaction(db, {
      campaignId: campaign.id,
      key: 'watch',
      name: 'City Watch',
      kind: 'civic',
      summary: 'Keeps order',
      sortOrder: 0,
      source: 'campaign_create',
      deityId: null
    })
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Captain',
      role: 'guard',
      disposition: 'wary',
      temperament: 'disciplined',
      canSpeak: true,
      factionId: faction.id,
      factionMembershipRole: 'captain'
    })
    const line = loadNpcFactionStandingLine(db, { npc, characterId: character.id })
    expect(line).toContain('City Watch')
    expect(line).toContain('neutral')
  })
})

describe('loadNpcFactionStandingLine friendly', () => {
  it('surfaces non-neutral PC reputation for member NPCs', () => {
    const { db, campaign, region, character } = seedPlayWorld()
    const faction = createFaction(db, {
      campaignId: campaign.id,
      key: 'temple',
      name: 'Tide Temple',
      kind: 'religious',
      summary: 'Clergy',
      sortOrder: 0,
      source: 'campaign_create'
    })
    applyCharacterFactionReputationDelta(db, {
      characterId: character.id,
      factionId: faction.id,
      delta: 40,
      reason: 'tithe'
    })
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Acolyte',
      role: 'cleric',
      disposition: 'friendly',
      temperament: 'disciplined',
      canSpeak: true,
      factionId: faction.id,
      factionMembershipRole: 'acolyte'
    })
    const line = loadNpcFactionStandingLine(db, { npc, characterId: character.id })
    expect(line).toContain('Tide Temple')
    expect(line).toContain('friendly')
    expect(line).toMatch(/25/)
  })
})
