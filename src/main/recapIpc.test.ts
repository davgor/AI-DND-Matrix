import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { closeFileTestDb, openFileTestDb, reopenFileTestDb } from '../db/fileDbTestUtils'
import { runMigrations } from '../db/migrations'
import { createCampaign, getSessionRecap, upsertSessionRecap } from '../db/repositories/campaigns'
import { appendEvent } from '../db/repositories/events'
import { touchLastPlayed } from '../db/repositories/sessions'
import { migrations } from '../db/schema'
import { createTestDb } from '../db/testUtils'
import { generateSessionRecap, getOrGenerateSessionRecap } from './recapIpc'

function seedCampaignWithEvent(content: string) {
  const db = createTestDb()
  const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
  appendEvent(db, {
    campaignId: campaign.id,
    type: 'player_action',
    payload: { content }
  })
  return { db, campaign }
}

describe('getOrGenerateSessionRecap empty and fresh', () => {
  it('returns start-of-story copy without calling the provider when there are no events', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
    const provider = createScriptedProvider([])
    const result = await getOrGenerateSessionRecap(db, provider, campaign.id)
    expect(result.text).toContain('start')
    expect(result.fromCache).toBe(false)
    expect(provider.calls).toHaveLength(0)
    expect(getSessionRecap(db, campaign.id)?.text).toBe(result.text)
  })

  it('skips the provider when a fresh persisted recap already covers lastPlayedAt', async () => {
    const { db, campaign } = seedCampaignWithEvent('fought a goblin')
    upsertSessionRecap(db, campaign.id, {
      text: 'Cached previously-on text.',
      generatedAt: '2026-07-20T12:00:00.000Z'
    })
    touchLastPlayed(db, campaign.id, '2026-07-20T11:00:00.000Z')
    const provider = createScriptedProvider(['Should not be used.'])
    const result = await getOrGenerateSessionRecap(db, provider, campaign.id)
    expect(result).toEqual({
      text: 'Cached previously-on text.',
      generatedAt: '2026-07-20T12:00:00.000Z',
      fromCache: true
    })
    expect(provider.calls).toHaveLength(0)
  })
})

describe('getOrGenerateSessionRecap generate paths', () => {
  it('calls the provider once and persists when recap is missing', async () => {
    const { db, campaign } = seedCampaignWithEvent('fought a goblin')
    const provider = createScriptedProvider(['Previously, you fought off a goblin ambush.'])
    const result = await getOrGenerateSessionRecap(db, provider, campaign.id)
    expect(result.text).toBe('Previously, you fought off a goblin ambush.')
    expect(result.fromCache).toBe(false)
    expect(provider.calls).toHaveLength(1)
    expect(getSessionRecap(db, campaign.id)?.text).toBe(result.text)
  })

  it('regenerates once when lastPlayedAt is strictly after generatedAt', async () => {
    const { db, campaign } = seedCampaignWithEvent('entered the ruins')
    upsertSessionRecap(db, campaign.id, {
      text: 'Stale recap.',
      generatedAt: '2026-07-20T12:00:00.000Z'
    })
    touchLastPlayed(db, campaign.id, '2026-07-20T13:00:00.000Z')
    const provider = createScriptedProvider(['Previously, you entered the ruins.'])
    const result = await getOrGenerateSessionRecap(db, provider, campaign.id)
    expect(result.text).toBe('Previously, you entered the ruins.')
    expect(result.fromCache).toBe(false)
    expect(provider.calls).toHaveLength(1)
    expect(getSessionRecap(db, campaign.id)?.text).toBe('Previously, you entered the ruins.')
  })
})

describe('generateSessionRecap', () => {
  it('returns a starting-story message when there are no recent events', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
    const provider = createScriptedProvider([])
    const recap = await generateSessionRecap(db, provider, campaign.id)
    expect(recap).toContain('start')
    expect(provider.calls).toHaveLength(0)
  })

  it('calls the provider with recent events and returns its narrated recap', async () => {
    const { db, campaign } = seedCampaignWithEvent('fought a goblin')
    const provider = createScriptedProvider(['Previously, you fought off a goblin ambush.'])
    const recap = await generateSessionRecap(db, provider, campaign.id)
    expect(recap).toBe('Previously, you fought off a goblin ambush.')
    expect(provider.calls[0]?.prompt).toContain('fought a goblin')
    expect(provider.calls[0]?.context?.maxTokens).toBe(256)
  })
})

describe('session recap restart persistence (124.5)', () => {
  let dir: string | undefined

  afterEach(() => {
    if (dir) {
      rmSync(dir, { recursive: true, force: true })
      dir = undefined
    }
  })

  it('survives DB reopen and skips regenerate when lastPlayed is unchanged', async () => {
    dir = mkdtempSync(join(tmpdir(), 'session-recap-restart-'))
    let db = openFileTestDb(join(dir, 'save.sqlite'))
    runMigrations(db, migrations)
    const campaign = createCampaign(db, {
      name: 'Restart Recap',
      premisePrompt: '...',
      deathMode: 'legendary'
    })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'player_action',
      payload: { content: 'fought a goblin' }
    })
    touchLastPlayed(db, campaign.id, '2026-07-20T11:00:00.000Z')
    const firstProvider = createScriptedProvider(['Previously, you fought off a goblin ambush.'])
    const first = await getOrGenerateSessionRecap(db, firstProvider, campaign.id)
    expect(first.fromCache).toBe(false)
    expect(firstProvider.calls).toHaveLength(1)
    db = reopenFileTestDb(db)
    expect(getSessionRecap(db, campaign.id)?.text).toBe(first.text)
    const secondProvider = createScriptedProvider(['Should not be used.'])
    const second = await getOrGenerateSessionRecap(db, secondProvider, campaign.id)
    expect(second).toEqual({
      text: first.text,
      generatedAt: first.generatedAt,
      fromCache: true
    })
    expect(secondProvider.calls).toHaveLength(0)
    closeFileTestDb(db)
  })
})
