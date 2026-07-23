import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { CampaignGenerationSchemaError } from '../agents/campaignGeneration'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { LlamaCppTruncationError } from '../agents/providers/llamacpp'
import { persistNpcEnrichmentResponses, buildCascadingSeedResponses } from '../test/fixtures/campaignGenerationFixtures'
import { isValidCreateCampaignRequest } from '../shared/campaignCreate/validation'
import { createCampaignFromRequest, resetCampaignCreateForTests } from './campaignCreateIpc'

function makeRegion(name: string) {
  return {
    name,
    description: `Description of ${name}.`,
    historyBackstory: `History of ${name}.`,
    recentHistory: `Recent events in ${name}.`,
    potentialQuests: [`Quest in ${name}`, `Another quest in ${name}`]
  }
}

describe('isValidCreateCampaignRequest', () => {
  it('accepts a minimal valid payload', () => {
    expect(
      isValidCreateCampaignRequest({ sessionId: 's1', premisePrompt: 'A haunted marsh' })
    ).toBe(true)
  })

  it('rejects missing premise', () => {
    expect(isValidCreateCampaignRequest({ sessionId: 's1', premisePrompt: '  ' })).toBe(false)
  })

  it('rejects invalid generation counts', () => {
    expect(
      isValidCreateCampaignRequest({
        sessionId: 's1',
        premisePrompt: 'A haunted marsh',
        regionCount: 99
      })
    ).toBe(false)
  })
})

describe('createCampaignFromRequest success', () => {
  it('persists one campaign on success', async () => {
    resetCampaignCreateForTests()
    const db = createTestDb()
    const provider = createScriptedProvider([
      ...buildCascadingSeedResponses({ regionCount: 2, npcsPerRegion: 3 }),
      ...persistNpcEnrichmentResponses(6)
    ])
    const result = await createCampaignFromRequest(db, provider, {
      sessionId: 'session-1',
      premisePrompt: 'A haunted marsh',
      deathMode: 'standard'
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.detail.regions.length).toBeGreaterThan(0)
      expect(result.detail.regionExtras.length).toBe(result.detail.regions.length)
    }
  })

  it('honors custom generation counts on the setup input', async () => {
    resetCampaignCreateForTests()
    const db = createTestDb()
    const oneRegionResponses = buildCascadingSeedResponses({
      regionCount: 1,
      npcsPerRegion: 1,
      regions: [makeRegion('Lonely Reach')],
      storyThread: { title: 'Solo Arc', state: 'starting', summary: 'A small start.' }
    })
    const provider = createScriptedProvider([...oneRegionResponses, ...persistNpcEnrichmentResponses(1)])
    const result = await createCampaignFromRequest(db, provider, {
      sessionId: 'session-counts',
      premisePrompt: 'A sparse frontier',
      regionCount: 1,
      npcsPerRegion: 1
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.detail.regions).toHaveLength(1)
      expect(result.detail.npcs).toHaveLength(1)
    }
  })
})

describe('createCampaignFromRequest failure', () => {
  it('returns typed generation failure without partial rows', async () => {
    resetCampaignCreateForTests()
    const db = createTestDb()
    const provider = createScriptedProvider(['not-json'])
    const before = db.prepare('SELECT COUNT(*) as count FROM campaigns').get() as { count: number }
    const result = await createCampaignFromRequest(db, provider, {
      sessionId: 'session-2',
      premisePrompt: 'Broken'
    })
    const after = db.prepare('SELECT COUNT(*) as count FROM campaigns').get() as { count: number }
    expect(result.ok).toBe(false)
    expect(after.count).toBe(before.count)
  })

  it('maps provider truncation to an actionable generation failure', async () => {
    resetCampaignCreateForTests()
    const db = createTestDb()
    const provider = {
      async generate(): Promise<string> {
        throw new LlamaCppTruncationError('truncated at max_tokens')
      }
    }
    const result = await createCampaignFromRequest(db, provider, {
      sessionId: 'session-trunc',
      premisePrompt: 'A mysterious river kingdom'
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.category).toBe('generation')
      expect(result.message).toMatch(/output limit|context/i)
      expect(result.message).not.toMatch(/invalid campaign/i)
    }
  })
})

describe('createCampaignFromRequest world schema messaging (020.30)', () => {
  it('maps world schema failure to a world-specific generation message', async () => {
    resetCampaignCreateForTests()
    const db = createTestDb()
    const provider = {
      async generate(): Promise<string> {
        throw new CampaignGenerationSchemaError(
          'DM agent did not return a valid world schema after retries'
        )
      }
    }
    const result = await createCampaignFromRequest(db, provider, {
      sessionId: 'session-world-schema',
      premisePrompt: 'A mysterious river kingdom'
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.category).toBe('generation')
      expect(result.message).toMatch(/world/i)
      expect(result.message).not.toMatch(/invalid campaign/i)
    }
  })
})

describe('createCampaignFromRequest factions schema messaging (020.33)', () => {
  it('maps factions schema failure to a factions-specific generation message', async () => {
    resetCampaignCreateForTests()
    const db = createTestDb()
    const provider = {
      async generate(): Promise<string> {
        throw new CampaignGenerationSchemaError(
          'DM agent did not return a valid factions schema after retries'
        )
      }
    }
    const result = await createCampaignFromRequest(db, provider, {
      sessionId: 'session-factions-schema',
      premisePrompt: 'A mysterious river kingdom'
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.category).toBe('generation')
      expect(result.message).toMatch(/factions/i)
      expect(result.message).not.toMatch(/invalid campaign/i)
    }
  })
})

describe('createCampaignFromRequest schema failure logging (020.31)', () => {
  it('logs attached failed attempt payloads via the create logger', async () => {
    resetCampaignCreateForTests()
    const db = createTestDb()
    const logLines: string[] = []
    const provider = {
      async generate(): Promise<string> {
        throw new CampaignGenerationSchemaError(
          'DM agent did not return a valid world schema after retries',
          [{ attempt: 1, reason: 'unparseable', raw: 'LOCAL_MODEL_WORLD_DUMP' }]
        )
      }
    }
    const result = await createCampaignFromRequest(
      db,
      provider,
      { sessionId: 'session-world-log', premisePrompt: 'A mysterious river kingdom' },
      {
        log: {
          error: (message: string, ...args: unknown[]) => {
            logLines.push([message, ...args.map(String)].join(' '))
          }
        }
      }
    )
    expect(result.ok).toBe(false)
    expect(logLines.some((line) => line.includes('LOCAL_MODEL_WORLD_DUMP'))).toBe(true)
    expect(logLines.some((line) => /schema failure details/i.test(line))).toBe(true)
  })
})
