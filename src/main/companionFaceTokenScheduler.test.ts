import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign, getCampaignById } from '../db/repositories/campaigns'
import {
  createCharacter,
  getCharacterById,
  updateCharacter
} from '../db/repositories/characters'
import { createMockImageProvider } from '../shared/imageGeneration'
import { COMPANION_FACE_TOKEN_ENTITY_KIND } from '../shared/partyMembers/types'
import {
  buildCompanionFaceTokenImageRequest,
  enqueueCompanionFaceTokenJob,
  maybeEnqueueCompanionFaceTokenAfterAccept,
  type CompanionFaceTokenSchedulerDeps
} from './companionFaceTokenScheduler'

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

function seedCompanion(
  db: ReturnType<typeof createTestDb>,
  opts?: { toggleOn?: boolean; portraitPath?: string | null }
) {
  const campaign = createCampaign(db, {
    name: 'Companion Scheduler Test',
    premisePrompt: 'test',
    deathMode: 'legendary',
    npcFaceTokenGenerationEnabled: opts?.toggleOn === true
  })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Asha',
    characterClass: 'fighter',
    kind: 'player'
  })
  const companion = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Bryn',
    characterClass: 'ranger',
    kind: 'ai_party_member',
    ownerPlayerCharacterId: player.id,
    raceKey: 'elf',
    portraitPath: opts?.portraitPath,
    stats: {
      companionRole: 'scout',
      appearance: { hairColor: 'auburn', age: 'young adult', eyeColor: 'green' }
    }
  })
  return { campaign, companion: getCharacterById(db, companion.id)! }
}

function buildDeps(
  db: ReturnType<typeof createTestDb>,
  baseDir: string,
  imageProvider: CompanionFaceTokenSchedulerDeps['imageProvider'],
  logger = { warn: vi.fn(), error: vi.fn() }
): CompanionFaceTokenSchedulerDeps {
  return {
    db,
    getCampaign: (id) => getCampaignById(db, id),
    getCompanion: (id) => getCharacterById(db, id),
    imageProvider,
    imageProviderReady: true,
    baseDir,
    logger
  }
}

async function flushFaceTokenJobs(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('buildCompanionFaceTokenImageRequest', () => {
  it('maps companion identity and appearance with ai_party_member entity kind', () => {
    const db = createTestDb()
    const { campaign, companion } = seedCompanion(db)
    const request = buildCompanionFaceTokenImageRequest(companion, campaign.id)
    expect(request.entityKind).toBe(COMPANION_FACE_TOKEN_ENTITY_KIND)
    expect(request.entityId).toBe(companion.id)
    expect(request.campaignId).toBe(campaign.id)
    expect(request.identity.name).toBe('Bryn')
    expect(request.identity.role).toBe('scout')
    expect(request.identity.raceKey).toBe('elf')
    expect(request.identity.hairColor).toBe('auburn')
    expect(request.identity.age).toBe('young adult')
    expect(request.identity.eyeColor).toBe('green')
    expect(request.prompt).toContain('AI party companion')
    expect(request.prompt).toContain(COMPANION_FACE_TOKEN_ENTITY_KIND)
  })
})

describe('enqueue skip: toggle OFF', () => {
  it('returns skipped when campaign npcFaceTokenGenerationEnabled is OFF', async () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'companion-face-sched-off-'))
    const provider = createMockImageProvider({
      mode: 'success',
      mimeType: 'image/png',
      bytesBase64: PNG_BASE64
    })
    const { campaign, companion } = seedCompanion(db, { toggleOn: false })
    const deps = buildDeps(db, baseDir, provider)
    try {
      expect(
        enqueueCompanionFaceTokenJob(deps, {
          campaignId: campaign.id,
          companionId: companion.id
        })
      ).toBe('skipped')
      await flushFaceTokenJobs()
      expect(provider.calls).toHaveLength(0)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('enqueue skip: existing portrait', () => {
  it('returns skipped when companion already has a portrait/face token', async () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'companion-face-sched-has-'))
    const provider = createMockImageProvider({
      mode: 'success',
      mimeType: 'image/png',
      bytesBase64: PNG_BASE64
    })
    const { campaign, companion } = seedCompanion(db, {
      toggleOn: true,
      portraitPath: '/data/existing.png'
    })
    const deps = buildDeps(db, baseDir, provider)
    try {
      expect(
        enqueueCompanionFaceTokenJob(deps, {
          campaignId: campaign.id,
          companionId: companion.id
        })
      ).toBe('skipped')
      await flushFaceTokenJobs()
      expect(provider.calls).toHaveLength(0)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('enqueue skip: non-companion', () => {
  it('returns skipped for non-companion characters', async () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'companion-face-sched-player-'))
    const provider = createMockImageProvider({
      mode: 'success',
      mimeType: 'image/png',
      bytesBase64: PNG_BASE64
    })
    const campaign = createCampaign(db, {
      name: 'P',
      premisePrompt: 't',
      deathMode: 'legendary',
      npcFaceTokenGenerationEnabled: true
    })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Asha',
      characterClass: 'fighter',
      kind: 'player'
    })
    const deps = buildDeps(db, baseDir, provider)
    try {
      expect(
        enqueueCompanionFaceTokenJob(deps, {
          campaignId: campaign.id,
          companionId: player.id
        })
      ).toBe('skipped')
      await flushFaceTokenJobs()
      expect(provider.calls).toHaveLength(0)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('enqueueCompanionFaceTokenJob async generation', () => {
  it('enqueues async generation with companion entity type without blocking', async () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'companion-face-sched-enqueue-'))
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
    const { campaign, companion } = seedCompanion(db, { toggleOn: true })
    const deps = buildDeps(db, baseDir, deferredProvider)
    try {
      expect(
        enqueueCompanionFaceTokenJob(deps, {
          campaignId: campaign.id,
          companionId: companion.id
        })
      ).toBe('enqueued')
      expect(deferredProvider.calls).toHaveLength(0)
      expect(getCharacterById(db, companion.id)?.portraitPath).toBeNull()
      releaseGenerate?.()
      await flushFaceTokenJobs()
      expect(deferredProvider.calls).toHaveLength(1)
      expect(deferredProvider.calls[0]?.request.entityKind).toBe(COMPANION_FACE_TOKEN_ENTITY_KIND)
      expect(deferredProvider.calls[0]?.request.entityId).toBe(companion.id)
      const stored = getCharacterById(db, companion.id)?.portraitPath
      expect(stored).toBeTruthy()
      expect(existsSync(stored!)).toBe(true)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('enqueueCompanionFaceTokenJob error handling', () => {
  it('logs provider failures without persisting a token', async () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'companion-face-sched-fail-'))
    const provider = createMockImageProvider({
      mode: 'failure',
      category: 'provider_unavailable',
      message: 'offline'
    })
    const logger = { warn: vi.fn(), error: vi.fn() }
    const { campaign, companion } = seedCompanion(db, { toggleOn: true })
    const deps = buildDeps(db, baseDir, provider, logger)
    try {
      enqueueCompanionFaceTokenJob(deps, {
        campaignId: campaign.id,
        companionId: companion.id
      })
      await flushFaceTokenJobs()
      expect(getCharacterById(db, companion.id)?.portraitPath).toBeNull()
      expect(logger.warn).toHaveBeenCalled()
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })

  it('logs unexpected job errors without throwing to callers', async () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'companion-face-sched-throw-'))
    const logger = { warn: vi.fn(), error: vi.fn() }
    const { campaign, companion } = seedCompanion(db, { toggleOn: true })
    const deps = buildDeps(
      db,
      baseDir,
      { generateImage: vi.fn().mockRejectedValue(new Error('boom')) },
      logger
    )
    try {
      expect(() =>
        enqueueCompanionFaceTokenJob(deps, {
          campaignId: campaign.id,
          companionId: companion.id
        })
      ).not.toThrow()
      await flushFaceTokenJobs()
      expect(logger.error).toHaveBeenCalled()
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('maybeEnqueueCompanionFaceTokenAfterAccept', () => {
  it('delegates to enqueue for eligible companions', async () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'companion-face-sched-accept-'))
    const provider = createMockImageProvider({
      mode: 'success',
      mimeType: 'image/png',
      bytesBase64: PNG_BASE64
    })
    const { campaign, companion } = seedCompanion(db, { toggleOn: true })
    const deps = buildDeps(db, baseDir, provider)
    try {
      expect(
        maybeEnqueueCompanionFaceTokenAfterAccept(deps, campaign.id, companion.id)
      ).toBe('enqueued')
      await flushFaceTokenJobs()
      expect(provider.calls).toHaveLength(1)
      expect(provider.calls[0]?.request.entityKind).toBe(COMPANION_FACE_TOKEN_ENTITY_KIND)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('companion appearance feeds prompt after extras persist', () => {
  it('reads appearance from companion stats for the image request', () => {
    const db = createTestDb()
    const { campaign, companion } = seedCompanion(db)
    updateCharacter(db, companion.id, {
      stats: {
        ...(companion.stats as Record<string, unknown>),
        appearance: { hairColor: 'silver', age: 'elder', eyeColor: 'violet' }
      }
    })
    const refreshed = getCharacterById(db, companion.id)!
    const request = buildCompanionFaceTokenImageRequest(refreshed, campaign.id)
    expect(request.identity.hairColor).toBe('silver')
    expect(request.identity.age).toBe('elder')
    expect(request.identity.eyeColor).toBe('violet')
  })
})
