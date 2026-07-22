import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter, getCharacterById } from '../db/repositories/characters'
import { createMockImageProvider } from '../shared/imageGeneration'
import {
  createPlayerCharacterIconIpcDeps,
  generatePlayerCharacterIconJob,
  replacePlayerCharacterPortrait
} from './playerCharacterIconIpc'

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

function seedPlayerWithPortrait() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'C',
    premisePrompt: 'p',
    deathMode: 'legendary'
  })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    characterClass: 'ranger',
    kind: 'player',
    portraitPath: '/old/good.png',
    portraitPrompt: 'old prompt'
  })
  return { db, campaign, player }
}

describe('generatePlayerCharacterIconJob draft path', () => {
  it('writes a draft path without characterId', async () => {
    const db = createTestDb()
    const baseDir = mkdtempSync(join(tmpdir(), 'player-icon-job-'))
    try {
      const deps = createPlayerCharacterIconIpcDeps(db, {
        baseDir,
        imageProvider: createMockImageProvider({
          mode: 'success',
          mimeType: 'image/png',
          bytesBase64: PNG_BASE64
        })
      })
      const result = await generatePlayerCharacterIconJob(deps, {
        campaignId: 'camp-1',
        name: 'Kael',
        role: 'ranger',
        appearancePrompt: 'ash-blond scarred ranger'
      })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.portraitPath).toContain(baseDir)
      }
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('generatePlayerCharacterIconJob failed regen', () => {
  it('leaves prior path intact', async () => {
    const { db, campaign, player } = seedPlayerWithPortrait()
    const baseDir = mkdtempSync(join(tmpdir(), 'player-icon-fail-'))
    try {
      const deps = createPlayerCharacterIconIpcDeps(db, {
        baseDir,
        imageProvider: createMockImageProvider({
          mode: 'failure',
          category: 'timeout',
          message: 'slow'
        })
      })
      const failed = await generatePlayerCharacterIconJob(deps, {
        campaignId: campaign.id,
        characterId: player.id,
        name: 'Kael',
        role: 'ranger',
        appearancePrompt: 'new look'
      })
      expect(failed.ok).toBe(false)
      expect(getCharacterById(db, player.id)?.portraitPath).toBe('/old/good.png')
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('generatePlayerCharacterIconJob success regen', () => {
  it('updates path and prompt', async () => {
    const { db, campaign, player } = seedPlayerWithPortrait()
    const baseDir = mkdtempSync(join(tmpdir(), 'player-icon-ok-'))
    try {
      const deps = createPlayerCharacterIconIpcDeps(db, {
        baseDir,
        imageProvider: createMockImageProvider({
          mode: 'success',
          mimeType: 'image/png',
          bytesBase64: PNG_BASE64
        })
      })
      const ok = await generatePlayerCharacterIconJob(deps, {
        campaignId: campaign.id,
        characterId: player.id,
        name: 'Kael',
        role: 'ranger',
        appearancePrompt: 'new look'
      })
      expect(ok.ok).toBe(true)
      expect(getCharacterById(db, player.id)?.portraitPrompt).toBe('new look')
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('replacePlayerCharacterPortrait', () => {
  it('overwrites path and clears prompt provenance', () => {
    const { db, player } = seedPlayerWithPortrait()
    const updated = replacePlayerCharacterPortrait(db, {
      characterId: player.id,
      portraitPath: '/upload.png'
    })
    expect(updated?.portraitPath).toBe('/upload.png')
    expect(updated?.portraitPrompt).toBeNull()
  })
})
