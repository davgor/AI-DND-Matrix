import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter, getCharacterById } from '../db/repositories/characters'
import {
  COMPANION_FACE_TOKEN_SUBFOLDER,
  persistCompanionFaceTokenAsset,
  resolveCompanionFaceTokenPath,
  writeCompanionFaceTokenAsset
} from './companionFaceTokenAsset'

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

function seedCompanion(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Companion Token Test',
    premisePrompt: 'test',
    deathMode: 'legendary'
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
    ownerPlayerCharacterId: player.id
  })
  return { campaign, companion }
}

describe('writeCompanionFaceTokenAsset', () => {
  it('writes PNG bytes under companion-face-tokens/{campaignId}/{companionId}.png', () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'companion-face-token-write-'))
    try {
      const path = writeCompanionFaceTokenAsset({
        baseDir,
        campaignId: 'camp-xyz',
        companionId: 'comp-abc',
        bytesBase64: PNG_BASE64,
        mimeType: 'image/png'
      })
      expect(path).toBe(
        join(baseDir, COMPANION_FACE_TOKEN_SUBFOLDER, 'camp-xyz', 'comp-abc.png')
      )
      expect(existsSync(path!)).toBe(true)
      expect(readFileSync(path!, 'base64')).toBe(PNG_BASE64)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })

  it('returns null for unsupported mime types', () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'companion-face-token-mime-'))
    try {
      expect(
        writeCompanionFaceTokenAsset({
          baseDir,
          campaignId: 'camp',
          companionId: 'comp',
          bytesBase64: PNG_BASE64,
          mimeType: 'image/gif'
        })
      ).toBeNull()
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('persistCompanionFaceTokenAsset', () => {
  it('writes the file and stores portrait_path on the companion row', () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'companion-face-token-persist-'))
    const { campaign, companion } = seedCompanion(db)
    try {
      const path = persistCompanionFaceTokenAsset(db, {
        companionId: companion.id,
        campaignId: campaign.id,
        bytesBase64: PNG_BASE64,
        mimeType: 'image/png',
        baseDir
      })
      expect(path).toBeTruthy()
      expect(existsSync(path!)).toBe(true)
      expect(getCharacterById(db, companion.id)?.portraitPath).toBe(path)
      expect(resolveCompanionFaceTokenPath(path)).toBe(path)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })

  it('round-trips: stored path survives reload via getCharacterById', () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'companion-face-token-reload-'))
    const { campaign, companion } = seedCompanion(db)
    try {
      const path = persistCompanionFaceTokenAsset(db, {
        companionId: companion.id,
        campaignId: campaign.id,
        bytesBase64: PNG_BASE64,
        mimeType: 'image/png',
        baseDir
      })
      const reloaded = getCharacterById(db, companion.id)
      expect(reloaded?.portraitPath).toBe(path)
      expect(resolveCompanionFaceTokenPath(reloaded?.portraitPath ?? null)).toBe(path)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('resolveCompanionFaceTokenPath', () => {
  it('returns null when the file is missing', () => {
    expect(resolveCompanionFaceTokenPath('/missing/companion.png')).toBeNull()
    expect(resolveCompanionFaceTokenPath(null)).toBeNull()
  })
})
