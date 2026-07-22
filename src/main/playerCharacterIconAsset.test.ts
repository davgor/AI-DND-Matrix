import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter, getCharacterById } from '../db/repositories/characters'
import {
  PLAYER_CHARACTER_ICON_SUBFOLDER,
  persistPlayerCharacterIconAsset,
  writePlayerCharacterIconAsset
} from './playerCharacterIconAsset'

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

function seedPlayer(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Player Icon Test',
    premisePrompt: 'test',
    deathMode: 'legendary'
  })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    characterClass: 'ranger',
    kind: 'player'
  })
  return { campaign, player }
}

describe('writePlayerCharacterIconAsset', () => {
  it('writes PNG bytes under portraits/{characterId}.png', () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'player-icon-write-'))
    try {
      const path = writePlayerCharacterIconAsset({
        baseDir,
        characterId: 'pc-abc',
        bytesBase64: PNG_BASE64,
        mimeType: 'image/png'
      })
      expect(path).toBe(join(baseDir, PLAYER_CHARACTER_ICON_SUBFOLDER, 'pc-abc.png'))
      expect(existsSync(path!)).toBe(true)
      expect(readFileSync(path!, 'base64')).toBe(PNG_BASE64)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('persistPlayerCharacterIconAsset', () => {
  it('writes the file and stores portrait_path + portrait_prompt', () => {
    const db = createTestDb()
    const { player } = seedPlayer(db)
    const baseDir = mkdtempSync(join(tmpdir(), 'player-icon-persist-'))
    try {
      const path = persistPlayerCharacterIconAsset(db, {
        characterId: player.id,
        bytesBase64: PNG_BASE64,
        mimeType: 'image/png',
        appearancePrompt: 'scar across left cheek',
        baseDir
      })
      expect(path).toBeTruthy()
      const fetched = getCharacterById(db, player.id)
      expect(fetched?.portraitPath).toBe(path)
      expect(fetched?.portraitPrompt).toBe('scar across left cheek')
      expect(existsSync(path!)).toBe(true)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})
