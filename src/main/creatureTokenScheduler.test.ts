import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign, getCampaignById } from '../db/repositories/campaigns'
import {
  createBestiarySpecies,
  getBestiarySpeciesById
} from '../db/repositories/bestiary'
import { createMockImageProvider } from '../shared/imageGeneration'
import {
  buildCreatureTokenGenerateRequest,
  enqueueCreatureTokenJob,
  maybeEnqueueCreatureTokenAfterSpeciesCreate,
  maybeEnqueueCreatureTokenAfterSpawn,
  maybeEnqueueCreatureTokensForSpecies,
  type CreatureTokenSchedulerDeps
} from './creatureTokenScheduler'

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

function seedSpecies(
  db: ReturnType<typeof createTestDb>,
  opts?: { toggleOn?: boolean; creatureTokenPath?: string | null }
) {
  const campaign = createCampaign(db, {
    name: 'Scheduler Test',
    premisePrompt: 'test',
    deathMode: 'legendary',
    enemyTokenGenerationEnabled: opts?.toggleOn === true
  })
  const species = createBestiarySpecies(db, {
    campaignId: campaign.id,
    key: 'gray-wolf',
    name: 'Gray Wolf',
    baseLore: 'Pack hunters of the borderlands.',
    visualAppearance: {
      silhouette: 'quadruped canine',
      sizeClass: 'medium',
      primaryColors: ['grey'],
      distinguishingMarks: null,
      textureOrMaterial: 'matted fur'
    },
    buckets: ['beast'],
    tags: ['wolf']
  })
  if (opts?.creatureTokenPath !== undefined) {
    db.prepare('UPDATE bestiary_species SET creature_token_path = ? WHERE id = ?').run(
      opts.creatureTokenPath,
      species.id
    )
  }
  return { campaign, species: getBestiarySpeciesById(db, species.id)! }
}

function buildDeps(
  db: ReturnType<typeof createTestDb>,
  baseDir: string,
  imageProvider: CreatureTokenSchedulerDeps['imageProvider'],
  logger = { warn: vi.fn(), error: vi.fn() }
): CreatureTokenSchedulerDeps {
  return {
    db,
    getCampaign: (id) => getCampaignById(db, id),
    getSpecies: (id) => getBestiarySpeciesById(db, id),
    imageProvider,
    imageProviderReady: true,
    baseDir,
    logger
  }
}

async function flushCreatureTokenJobs(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('buildCreatureTokenGenerateRequest', () => {
  it('maps species appearance and lore slice into the generation request', () => {
    const db = createTestDb()
    const { campaign, species } = seedSpecies(db)
    const request = buildCreatureTokenGenerateRequest(species, campaign.id)
    expect(request.speciesId).toBe(species.id)
    expect(request.campaignId).toBe(campaign.id)
    expect(request.speciesName).toBe('Gray Wolf')
    expect(request.appearance.silhouette).toBe('quadruped canine')
    expect(request.loreSlice).toBe('Pack hunters of the borderlands.')
  })
})

describe('enqueueCreatureTokenJob skip when toggle off', () => {
  it('returns skipped when campaign toggle is OFF', async () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'creature-sched-off-'))
    const provider = createMockImageProvider({
      mode: 'success',
      mimeType: 'image/png',
      bytesBase64: PNG_BASE64
    })
    const { campaign, species } = seedSpecies(db, { toggleOn: false })
    const deps = buildDeps(db, baseDir, provider)

    try {
      expect(
        enqueueCreatureTokenJob(deps, { campaignId: campaign.id, speciesId: species.id })
      ).toBe('skipped')
      await flushCreatureTokenJobs()
      expect(provider.calls).toHaveLength(0)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('enqueueCreatureTokenJob skip when token exists', () => {
  it('returns skipped when species already has a creature token path', async () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'creature-sched-has-token-'))
    const provider = createMockImageProvider({
      mode: 'success',
      mimeType: 'image/png',
      bytesBase64: PNG_BASE64
    })
    const { campaign, species } = seedSpecies(db, {
      toggleOn: true,
      creatureTokenPath: '/data/existing.png'
    })
    const deps = buildDeps(db, baseDir, provider)

    try {
      expect(
        enqueueCreatureTokenJob(deps, { campaignId: campaign.id, speciesId: species.id })
      ).toBe('skipped')
      await flushCreatureTokenJobs()
      expect(provider.calls).toHaveLength(0)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('enqueueCreatureTokenJob async generation', () => {
  it('enqueues async generation without blocking', async () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'creature-sched-enqueue-'))
    let releaseGenerate: (() => void) | undefined
    const generateGate = new Promise<void>((resolve) => {
      releaseGenerate = resolve
    })
    const provider = createMockImageProvider({
      mode: 'success',
      mimeType: 'image/png',
      bytesBase64: PNG_BASE64
    })
    const deferredProvider = {
      calls: provider.calls,
      async generateImage(request: Parameters<typeof provider.generateImage>[0]) {
        await generateGate
        return provider.generateImage(request)
      }
    }
    const { campaign, species } = seedSpecies(db, { toggleOn: true })
    const deps = buildDeps(db, baseDir, deferredProvider)

    try {
      expect(
        enqueueCreatureTokenJob(deps, { campaignId: campaign.id, speciesId: species.id })
      ).toBe('enqueued')
      expect(deferredProvider.calls).toHaveLength(0)
      expect(getBestiarySpeciesById(db, species.id)?.creatureTokenPath).toBeNull()
      releaseGenerate?.()
      await flushCreatureTokenJobs()
      expect(deferredProvider.calls).toHaveLength(1)
      expect(deferredProvider.calls[0]?.request.entityId).toBe(species.id)
      const stored = getBestiarySpeciesById(db, species.id)?.creatureTokenPath
      expect(stored).toBeTruthy()
      expect(existsSync(stored!)).toBe(true)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('enqueueCreatureTokenJob error handling', () => {
  it('logs provider failures without persisting a token', async () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'creature-sched-fail-'))
    const provider = createMockImageProvider({
      mode: 'failure',
      category: 'provider_unavailable',
      message: 'offline'
    })
    const logger = { warn: vi.fn(), error: vi.fn() }
    const { campaign, species } = seedSpecies(db, { toggleOn: true })
    const deps = buildDeps(db, baseDir, provider, logger)

    try {
      enqueueCreatureTokenJob(deps, { campaignId: campaign.id, speciesId: species.id })
      await flushCreatureTokenJobs()
      expect(getBestiarySpeciesById(db, species.id)?.creatureTokenPath).toBeNull()
      expect(logger.warn).toHaveBeenCalled()
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })

  it('logs unexpected job errors without throwing to callers', async () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'creature-sched-throw-'))
    const logger = { warn: vi.fn(), error: vi.fn() }
    const { campaign, species } = seedSpecies(db, { toggleOn: true })
    const deps = buildDeps(
      db,
      baseDir,
      {
        generateImage: vi.fn().mockRejectedValue(new Error('boom'))
      },
      logger
    )

    try {
      expect(() =>
        enqueueCreatureTokenJob(deps, { campaignId: campaign.id, speciesId: species.id })
      ).not.toThrow()
      await flushCreatureTokenJobs()
      expect(logger.error).toHaveBeenCalled()
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('maybeEnqueueCreatureTokenAfterSpeciesCreate', () => {
  it('delegates to enqueue', async () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'creature-sched-after-create-'))
    const provider = createMockImageProvider({
      mode: 'success',
      mimeType: 'image/png',
      bytesBase64: PNG_BASE64
    })
    const { campaign, species } = seedSpecies(db, { toggleOn: true })
    const deps = buildDeps(db, baseDir, provider)

    try {
      expect(
        maybeEnqueueCreatureTokenAfterSpeciesCreate(deps, {
          campaignId: campaign.id,
          speciesId: species.id
        })
      ).toBe('enqueued')
      await flushCreatureTokenJobs()
      expect(provider.calls).toHaveLength(1)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('maybeEnqueueCreatureTokenAfterSpawn', () => {
  it('is idempotent when token path is set', async () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'creature-sched-after-spawn-'))
    const provider = createMockImageProvider({
      mode: 'success',
      mimeType: 'image/png',
      bytesBase64: PNG_BASE64
    })
    const { campaign, species } = seedSpecies(db, {
      toggleOn: true,
      creatureTokenPath: '/data/existing.png'
    })
    const deps = buildDeps(db, baseDir, provider)

    try {
      expect(
        maybeEnqueueCreatureTokenAfterSpawn(deps, {
          campaignId: campaign.id,
          speciesId: species.id
        })
      ).toBe('skipped')
      await flushCreatureTokenJobs()
      expect(provider.calls).toHaveLength(0)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('maybeEnqueueCreatureTokensForSpecies', () => {
  it('enqueues per species without token', async () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'creature-sched-bulk-'))
    const provider = createMockImageProvider({
      mode: 'success',
      mimeType: 'image/png',
      bytesBase64: PNG_BASE64
    })
    const { campaign, species } = seedSpecies(db, { toggleOn: true })
    const withToken = createBestiarySpecies(db, {
      campaignId: campaign.id,
      key: 'boar',
      name: 'Boar',
      baseLore: 'Tusked rooters.',
      buckets: ['beast'],
      tags: ['boar']
    })
    db.prepare('UPDATE bestiary_species SET creature_token_path = ? WHERE id = ?').run(
      '/data/boar.png',
      withToken.id
    )
    const deps = buildDeps(db, baseDir, provider)

    try {
      maybeEnqueueCreatureTokensForSpecies(deps, campaign.id, [
        species,
        getBestiarySpeciesById(db, withToken.id)!
      ])
      await flushCreatureTokenJobs()
      expect(provider.calls).toHaveLength(1)
      expect(provider.calls[0]?.request.entityId).toBe(species.id)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})
