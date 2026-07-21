import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { closeFileTestDb, openFileTestDb, reopenFileTestDb } from '../db/fileDbTestUtils'
import { runMigrations } from '../db/migrations'
import { migrations } from '../db/schema'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCampaignRace } from '../db/repositories/campaignRaces'
import {
  createCharacter,
  listPartyMembersForPlayer
} from '../db/repositories/characters'
import { listCharacterItems } from '../db/repositories/characterItems'
import { findCatalogItemByName } from '../db/repositories/items'
import type { CompanionPreviewDto } from '../shared/partyMembers/types'
import type { RaceLore } from '../shared/raceSelection/types'
import { acceptCompanionPreview } from './companionsIpc'
import { resolveCompanionStarterWeaponName } from './companionStarterGear'

const ELF_LORE: RaceLore = {
  summary: 'Elves guard the mistwood.',
  appearance: 'Pale and tall.',
  culture: 'Reclusive.',
  roleInThisLand: 'Wardens.',
  hooks: ['A grove dies.']
}

function buildPreview(playerId: string, inventoryItemIds: string[] = []): CompanionPreviewDto {
  return {
    name: 'Bryn',
    characterClass: 'ranger',
    personality: 'Quiet scout.',
    raceKey: 'elf',
    role: 'scout',
    appearance: { hairColor: 'auburn', age: 'young adult', eyeColor: 'green' },
    inventoryItemIds,
    ownerPlayerCharacterId: playerId,
    pcContextDigest: 'Asha · human · soldier · fighter'
  }
}

function seedCompanionsPlayer(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'M',
    premisePrompt: 'A realm.',
    deathMode: 'legendary'
  })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Asha',
    characterClass: 'fighter',
    kind: 'player',
    guidedCreationPhase: 'companions'
  })
  createCampaignRace(db, {
    campaignId: campaign.id,
    raceKey: 'elf',
    kind: 'preset',
    label: 'Elf',
    seedPrompt: 'Graceful.',
    lore: ELF_LORE
  })
  return { campaign, player }
}

describe('resolveCompanionStarterWeaponName', () => {
  it('maps ranger class to the ranger package first weapon', () => {
    expect(resolveCompanionStarterWeaponName('ranger', 'scout')).toBe('Hunting Bow')
  })

  it('falls back to fighter when class is unknown', () => {
    expect(resolveCompanionStarterWeaponName('adventurer', '')).toBe('Longsword')
  })
})

describe('acceptCompanionPreview starter gear', () => {
  it('grants archetype starter weapon when preview inventory is empty', async () => {
    const db = createTestDb()
    const { campaign, player } = seedCompanionsPlayer(db)
    const provider = createScriptedProvider([])
    await acceptCompanionPreview(db, provider, {
      campaignId: campaign.id,
      characterId: player.id,
      preview: buildPreview(player.id)
    })
    const member = listPartyMembersForPlayer(db, player.id)[0]!
    const bow = findCatalogItemByName(db, 'Hunting Bow')!
    const items = listCharacterItems(db, member.id)
    expect(items.some((row) => row.itemId === bow.id)).toBe(true)
  })

  it('still drops invalid preview catalog ids', async () => {
    const db = createTestDb()
    const { campaign, player } = seedCompanionsPlayer(db)
    const dagger = findCatalogItemByName(db, 'Dagger')!
    const provider = createScriptedProvider([])
    await acceptCompanionPreview(db, provider, {
      campaignId: campaign.id,
      characterId: player.id,
      preview: buildPreview(player.id, [dagger.id, 'item-unknown'])
    })
    const member = listPartyMembersForPlayer(db, player.id)[0]!
    const items = listCharacterItems(db, member.id)
    expect(items.some((row) => row.itemId === dagger.id)).toBe(true)
    expect(items.some((row) => row.itemId === 'item-unknown')).toBe(false)
  })
})

describe('acceptCompanionPreview starter gear persistence', () => {
  let dir: string | undefined
  let db: Database.Database | undefined

  afterEach(() => {
    closeFileTestDb(db)
    db = undefined
    if (dir) {
      rmSync(dir, { recursive: true, force: true })
      dir = undefined
    }
  })

  it('persists companion inventory across DB reopen', async () => {
    dir = mkdtempSync(join(tmpdir(), 'companion-gear-restart-'))
    db = openFileTestDb(join(dir, 'save.sqlite'))
    runMigrations(db, migrations)
    const { campaign, player } = seedCompanionsPlayer(db)
    const provider = createScriptedProvider([])
    await acceptCompanionPreview(db, provider, {
      campaignId: campaign.id,
      characterId: player.id,
      preview: buildPreview(player.id)
    })
    const memberId = listPartyMembersForPlayer(db, player.id)[0]!.id
    const bowId = findCatalogItemByName(db, 'Hunting Bow')!.id
    db = reopenFileTestDb(db)
    const items = listCharacterItems(db, memberId)
    expect(items.some((row) => row.itemId === bowId)).toBe(true)
  })
})
