import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import {
  createBestiarySpecies,
  getBestiarySpeciesById,
  updateBestiarySpeciesCreatureTokenPath
} from '../db/repositories/bestiary'
import {
  CREATURE_TOKEN_SUBFOLDER,
  persistCreatureTokenAsset,
  resolveCreatureTokenPath,
  writeCreatureTokenAsset
} from './creatureTokenAsset'

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

function seedSpecies(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Token Test',
    premisePrompt: 'test',
    deathMode: 'legendary'
  })
  const species = createBestiarySpecies(db, {
    campaignId: campaign.id,
    key: 'gray-wolf',
    name: 'Gray Wolf',
    baseLore: 'Pack hunters of the borderlands.',
    buckets: ['beast'],
    tags: ['wolf']
  })
  return { campaign, species }
}

describe('writeCreatureTokenAsset', () => {
  it('writes PNG bytes under creature-tokens/{campaignId}/{speciesId}.png', () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'creature-token-write-'))
    try {
      const speciesId = 'species-abc'
      const campaignId = 'camp-xyz'

      const path = writeCreatureTokenAsset({
        baseDir,
        campaignId,
        speciesId,
        bytesBase64: PNG_BASE64,
        mimeType: 'image/png'
      })

      expect(path).toBe(
        join(baseDir, CREATURE_TOKEN_SUBFOLDER, campaignId, `${speciesId}.png`)
      )
      expect(existsSync(path!)).toBe(true)
      expect(readFileSync(path!, 'base64')).toBe(PNG_BASE64)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })

  it('returns null for unsupported mime types', () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'creature-token-mime-'))
    try {
      expect(
        writeCreatureTokenAsset({
          baseDir,
          campaignId: 'camp',
          speciesId: 'species',
          bytesBase64: PNG_BASE64,
          mimeType: 'image/gif'
        })
      ).toBeNull()
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('resolveCreatureTokenPath', () => {
  it('returns the path when the file exists', () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'creature-token-resolve-'))
    try {
      const path = writeCreatureTokenAsset({
        baseDir,
        campaignId: 'camp',
        speciesId: 'species',
        bytesBase64: PNG_BASE64,
        mimeType: 'image/png'
      })
      expect(resolveCreatureTokenPath(path)).toBe(path)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })

  it('returns null for null input', () => {
    expect(resolveCreatureTokenPath(null)).toBeNull()
  })

  it('returns null when the file is missing', () => {
    expect(resolveCreatureTokenPath('/tmp/does-not-exist/creature-token.png')).toBeNull()
  })
})

describe('persistCreatureTokenAsset success', () => {
  it('writes asset and binds path on the species row', () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'creature-token-persist-'))
    const { campaign, species } = seedSpecies(db)

    try {
      const path = persistCreatureTokenAsset(db, {
        speciesId: species.id,
        campaignId: campaign.id,
        bytesBase64: PNG_BASE64,
        mimeType: 'image/png',
        baseDir
      })

      expect(path).toBeTruthy()
      expect(getBestiarySpeciesById(db, species.id)?.creatureTokenPath).toBe(path)
      expect(existsSync(path!)).toBe(true)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('persistCreatureTokenAsset reload', () => {
  it('survives reload from DB (app restart simulation)', () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'creature-token-restart-'))
    const { campaign, species } = seedSpecies(db)

    try {
      const path = persistCreatureTokenAsset(db, {
        speciesId: species.id,
        campaignId: campaign.id,
        bytesBase64: PNG_BASE64,
        mimeType: 'image/png',
        baseDir
      })

      const reloaded = getBestiarySpeciesById(db, species.id)
      expect(reloaded?.creatureTokenPath).toBe(path)
      expect(resolveCreatureTokenPath(reloaded?.creatureTokenPath ?? null)).toBe(path)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('persistCreatureTokenAsset failures', () => {
  it('returns null and does not update DB when mime type is unsupported', () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'creature-token-fail-'))
    const { campaign, species } = seedSpecies(db)

    try {
      const path = persistCreatureTokenAsset(db, {
        speciesId: species.id,
        campaignId: campaign.id,
        bytesBase64: PNG_BASE64,
        mimeType: 'image/gif',
        baseDir
      })

      expect(path).toBeNull()
      expect(getBestiarySpeciesById(db, species.id)?.creatureTokenPath).toBeNull()
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('updateBestiarySpeciesCreatureTokenPath', () => {
  it('round-trips nullable creature token path', () => {
    const db = createTestDb()
    const { species } = seedSpecies(db)
    const storedPath = '/data/creature-tokens/camp/species.png'

    updateBestiarySpeciesCreatureTokenPath(db, species.id, storedPath)
    expect(getBestiarySpeciesById(db, species.id)?.creatureTokenPath).toBe(storedPath)

    updateBestiarySpeciesCreatureTokenPath(db, species.id, null)
    expect(getBestiarySpeciesById(db, species.id)?.creatureTokenPath).toBeNull()
  })
})
