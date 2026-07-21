import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createNpc, getNpcById, updateNpcFaceTokenPath } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import {
  NPC_FACE_TOKEN_SUBFOLDER,
  persistNpcFaceTokenAsset,
  resolveNpcFaceTokenPath,
  writeNpcFaceTokenAsset
} from './npcFaceTokenAsset'

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

function seedNpc(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Token Test',
    premisePrompt: 'test',
    deathMode: 'legendary'
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
    disposition: 'friendly'
  })
  return { campaign, npc }
}

describe('writeNpcFaceTokenAsset', () => {
  it('writes PNG bytes under npc-face-tokens/{campaignId}/{npcId}.png', () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'npc-face-token-write-'))
    try {
      const npcId = 'npc-abc'
      const campaignId = 'camp-xyz'

      const path = writeNpcFaceTokenAsset({
        baseDir,
        campaignId,
        npcId,
        bytesBase64: PNG_BASE64,
        mimeType: 'image/png'
      })

      expect(path).toBe(
        join(baseDir, NPC_FACE_TOKEN_SUBFOLDER, campaignId, `${npcId}.png`)
      )
      expect(existsSync(path!)).toBe(true)
      expect(readFileSync(path!, 'base64')).toBe(PNG_BASE64)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })

  it('returns null for unsupported mime types', () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'npc-face-token-mime-'))
    try {
      expect(
        writeNpcFaceTokenAsset({
          baseDir,
          campaignId: 'camp',
          npcId: 'npc',
          bytesBase64: PNG_BASE64,
          mimeType: 'image/gif'
        })
      ).toBeNull()
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('resolveNpcFaceTokenPath', () => {
  it('returns the path when the file exists', () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'npc-face-token-resolve-'))
    try {
      const path = writeNpcFaceTokenAsset({
        baseDir,
        campaignId: 'camp',
        npcId: 'npc',
        bytesBase64: PNG_BASE64,
        mimeType: 'image/png'
      })
      expect(resolveNpcFaceTokenPath(path)).toBe(path)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })

  it('returns null for null input', () => {
    expect(resolveNpcFaceTokenPath(null)).toBeNull()
  })

  it('returns null when the file is missing', () => {
    expect(resolveNpcFaceTokenPath('/tmp/does-not-exist/npc-face.png')).toBeNull()
  })
})

describe('persistNpcFaceTokenAsset success', () => {
  it('writes asset and binds path on the NPC row', () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'npc-face-token-persist-'))
    const { campaign, npc } = seedNpc(db)

    try {
      const path = persistNpcFaceTokenAsset(db, {
        npcId: npc.id,
        campaignId: campaign.id,
        bytesBase64: PNG_BASE64,
        mimeType: 'image/png',
        baseDir
      })

      expect(path).toBeTruthy()
      expect(getNpcById(db, npc.id)?.faceTokenPath).toBe(path)
      expect(existsSync(path!)).toBe(true)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('persistNpcFaceTokenAsset reload', () => {
  it('survives reload from DB (app restart simulation)', () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'npc-face-token-restart-'))
    const { campaign, npc } = seedNpc(db)

    try {
      const path = persistNpcFaceTokenAsset(db, {
        npcId: npc.id,
        campaignId: campaign.id,
        bytesBase64: PNG_BASE64,
        mimeType: 'image/png',
        baseDir
      })

      const reloaded = getNpcById(db, npc.id)
      expect(reloaded?.faceTokenPath).toBe(path)
      expect(resolveNpcFaceTokenPath(reloaded?.faceTokenPath ?? null)).toBe(path)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('persistNpcFaceTokenAsset failures', () => {
  it('returns null and does not update DB when mime type is unsupported', () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'npc-face-token-fail-'))
    const { campaign, npc } = seedNpc(db)

    try {
      const path = persistNpcFaceTokenAsset(db, {
        npcId: npc.id,
        campaignId: campaign.id,
        bytesBase64: PNG_BASE64,
        mimeType: 'image/gif',
        baseDir
      })

      expect(path).toBeNull()
      expect(getNpcById(db, npc.id)?.faceTokenPath).toBeNull()
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('updateNpcFaceTokenPath', () => {
  it('round-trips nullable face token path', () => {
    const db = createTestDb()
    const { npc } = seedNpc(db)
    const storedPath = '/data/npc-face-tokens/camp/npc.png'

    updateNpcFaceTokenPath(db, npc.id, storedPath)
    expect(getNpcById(db, npc.id)?.faceTokenPath).toBe(storedPath)

    updateNpcFaceTokenPath(db, npc.id, null)
    expect(getNpcById(db, npc.id)?.faceTokenPath).toBeNull()
  })
})
