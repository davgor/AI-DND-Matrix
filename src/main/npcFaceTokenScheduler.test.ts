import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign, getCampaignById } from '../db/repositories/campaigns'
import { createNpc, getNpcById } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { createMockImageProvider } from '../shared/imageGeneration'
import {
  buildNpcFaceTokenImageRequest,
  enqueueNpcFaceTokenJob,
  maybeEnqueueNpcFaceTokenAfterCreate,
  maybeEnqueueNpcFaceTokensForNpcs,
  type NpcFaceTokenSchedulerDeps
} from './npcFaceTokenScheduler'

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

function seedSpeakingNpc(
  db: ReturnType<typeof createTestDb>,
  opts?: { toggleOn?: boolean; canSpeak?: boolean; faceTokenPath?: string | null }
) {
  const campaign = createCampaign(db, {
    name: 'Scheduler Test',
    premisePrompt: 'test',
    deathMode: 'legendary',
    npcFaceTokenGenerationEnabled: opts?.toggleOn === true
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Oakhollow',
    description: 'A village.'
  })
  const npc = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Mira',
    role: 'innkeeper',
    disposition: 'friendly',
    canSpeak: opts?.canSpeak ?? true,
    hairColor: 'auburn',
    age: 'middle-aged',
    eyeColor: 'green'
  })
  if (opts?.faceTokenPath !== undefined) {
    db.prepare('UPDATE npcs SET face_token_path = ? WHERE id = ?').run(opts.faceTokenPath, npc.id)
  }
  return { campaign, npc: getNpcById(db, npc.id)! }
}

function buildDeps(
  db: ReturnType<typeof createTestDb>,
  baseDir: string,
  imageProvider: NpcFaceTokenSchedulerDeps['imageProvider'],
  logger = { warn: vi.fn(), error: vi.fn() }
): NpcFaceTokenSchedulerDeps {
  return {
    db,
    getCampaign: (id) => getCampaignById(db, id),
    getNpc: (id) => getNpcById(db, id),
    imageProvider,
    baseDir,
    logger
  }
}

async function flushFaceTokenJobs(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('buildNpcFaceTokenImageRequest', () => {
  it('maps NPC identity and appearance traits into the image request', () => {
    const db = createTestDb()
    const { campaign, npc } = seedSpeakingNpc(db)
    const request = buildNpcFaceTokenImageRequest(npc, campaign.id)
    expect(request.entityId).toBe(npc.id)
    expect(request.campaignId).toBe(campaign.id)
    expect(request.identity.name).toBe('Mira')
    expect(request.identity.hairColor).toBe('auburn')
    expect(request.identity.age).toBe('middle-aged')
    expect(request.identity.eyeColor).toBe('green')
  })
})

describe('enqueueNpcFaceTokenJob skip when toggle off or non-speaking', () => {
  it('returns skipped when campaign toggle is OFF', async () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'npc-face-sched-off-'))
    const provider = createMockImageProvider({
      mode: 'success',
      mimeType: 'image/png',
      bytesBase64: PNG_BASE64
    })
    const { campaign, npc } = seedSpeakingNpc(db, { toggleOn: false })
    const deps = buildDeps(db, baseDir, provider)

    try {
      expect(enqueueNpcFaceTokenJob(deps, { campaignId: campaign.id, npcId: npc.id })).toBe('skipped')
      await flushFaceTokenJobs()
      expect(provider.calls).toHaveLength(0)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })

  it('returns skipped for non-speaking NPCs when toggle is ON', async () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'npc-face-sched-nonspeak-'))
    const provider = createMockImageProvider({
      mode: 'success',
      mimeType: 'image/png',
      bytesBase64: PNG_BASE64
    })
    const { campaign, npc } = seedSpeakingNpc(db, { toggleOn: true, canSpeak: false })
    const deps = buildDeps(db, baseDir, provider)

    try {
      expect(enqueueNpcFaceTokenJob(deps, { campaignId: campaign.id, npcId: npc.id })).toBe('skipped')
      await flushFaceTokenJobs()
      expect(provider.calls).toHaveLength(0)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('enqueueNpcFaceTokenJob skip when token exists', () => {
  it('returns skipped when NPC already has a face token path', async () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'npc-face-sched-has-token-'))
    const provider = createMockImageProvider({
      mode: 'success',
      mimeType: 'image/png',
      bytesBase64: PNG_BASE64
    })
    const { campaign, npc } = seedSpeakingNpc(db, {
      toggleOn: true,
      faceTokenPath: '/data/existing.png'
    })
    const deps = buildDeps(db, baseDir, provider)

    try {
      expect(enqueueNpcFaceTokenJob(deps, { campaignId: campaign.id, npcId: npc.id })).toBe('skipped')
      await flushFaceTokenJobs()
      expect(provider.calls).toHaveLength(0)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('enqueueNpcFaceTokenJob async generation', () => {
  it('enqueues async generation for eligible speaking NPCs without blocking', async () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'npc-face-sched-enqueue-'))
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
    const { campaign, npc } = seedSpeakingNpc(db, { toggleOn: true })
    const deps = buildDeps(db, baseDir, deferredProvider)

    try {
      expect(enqueueNpcFaceTokenJob(deps, { campaignId: campaign.id, npcId: npc.id })).toBe('enqueued')
      expect(deferredProvider.calls).toHaveLength(0)
      expect(getNpcById(db, npc.id)?.faceTokenPath).toBeNull()
      releaseGenerate?.()
      await flushFaceTokenJobs()
      expect(deferredProvider.calls).toHaveLength(1)
      expect(deferredProvider.calls[0]?.request.entityId).toBe(npc.id)
      const stored = getNpcById(db, npc.id)?.faceTokenPath
      expect(stored).toBeTruthy()
      expect(existsSync(stored!)).toBe(true)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('enqueueNpcFaceTokenJob error handling', () => {
  it('logs provider failures without persisting a token', async () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'npc-face-sched-fail-'))
    const provider = createMockImageProvider({
      mode: 'failure',
      category: 'provider_unavailable',
      message: 'offline'
    })
    const logger = { warn: vi.fn(), error: vi.fn() }
    const { campaign, npc } = seedSpeakingNpc(db, { toggleOn: true })
    const deps = buildDeps(db, baseDir, provider, logger)

    try {
      enqueueNpcFaceTokenJob(deps, { campaignId: campaign.id, npcId: npc.id })
      await flushFaceTokenJobs()
      expect(getNpcById(db, npc.id)?.faceTokenPath).toBeNull()
      expect(logger.warn).toHaveBeenCalled()
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })

  it('logs unexpected job errors without throwing to callers', async () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'npc-face-sched-throw-'))
    const logger = { warn: vi.fn(), error: vi.fn() }
    const { campaign, npc } = seedSpeakingNpc(db, { toggleOn: true })
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
        enqueueNpcFaceTokenJob(deps, { campaignId: campaign.id, npcId: npc.id })
      ).not.toThrow()
      await flushFaceTokenJobs()
      expect(logger.error).toHaveBeenCalled()
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('maybeEnqueue helpers', () => {
  it('maybeEnqueueNpcFaceTokenAfterCreate delegates to enqueue', async () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'npc-face-sched-after-create-'))
    const provider = createMockImageProvider({
      mode: 'success',
      mimeType: 'image/png',
      bytesBase64: PNG_BASE64
    })
    const { campaign, npc } = seedSpeakingNpc(db, { toggleOn: true })
    const deps = buildDeps(db, baseDir, provider)

    try {
      expect(maybeEnqueueNpcFaceTokenAfterCreate(deps, campaign.id, npc.id)).toBe('enqueued')
      await flushFaceTokenJobs()
      expect(provider.calls).toHaveLength(1)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })

  it('maybeEnqueueNpcFaceTokensForNpcs enqueues per speaking NPC only', async () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'npc-face-sched-bulk-'))
    const provider = createMockImageProvider({
      mode: 'success',
      mimeType: 'image/png',
      bytesBase64: PNG_BASE64
    })
    const { campaign, npc } = seedSpeakingNpc(db, { toggleOn: true })
    const region = db
      .prepare('SELECT region_id FROM npcs WHERE id = ?')
      .get(npc.id) as { region_id: string }
    const silent = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.region_id,
      name: 'Beast',
      role: 'creature',
      disposition: 'hostile',
      canSpeak: false
    })
    const deps = buildDeps(db, baseDir, provider)

    try {
      maybeEnqueueNpcFaceTokensForNpcs(deps, campaign.id, [npc, silent])
      await flushFaceTokenJobs()
      expect(provider.calls).toHaveLength(1)
      expect(provider.calls[0]?.request.entityId).toBe(npc.id)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})
