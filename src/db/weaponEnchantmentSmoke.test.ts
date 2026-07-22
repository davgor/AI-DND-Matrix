import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { resolvePlayerTurn } from '../main/turnIpc'
import { resolvePlayerAttack } from '../main/combatResolvers'
import { closeFileTestDb, openFileTestDb, reopenFileTestDb } from './fileDbTestUtils'
import { runMigrations } from './migrations'
import { migrations } from './schema'
import { getCharacterById } from './repositories/characters'
import { getCatalogItemById } from './repositories/items'
import { getEquippedWeaponDamageProfile } from './repositories/characterItems'
import { listModifications } from './repositories/characterItemModifications'
import { seedWeaponEnchantmentSmoke } from './weaponEnchantmentSmokeFixtures'

const ENCHANT_INTENT = '{"intent":{"checkNeeded":false,"actionType":"modifyItem"}}'

describe('weapon enchantment smoke', () => {
  it('runs enchant → profile → attack → reopen loop', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'weapon-enchant-smoke-'))
    let db = openFileTestDb(join(dir, 'save.sqlite'))
    try {
      runMigrations(db, migrations)
      const seeded = seedWeaponEnchantmentSmoke(db)
      const catalogSnapshot = JSON.stringify(getCatalogItemById(db, seeded.longswordId)!.mechanicalProperties)

      const provider = createScriptedProvider([
        ENCHANT_INTENT,
        JSON.stringify({
          narrationText: 'Fire crawls along the steel.',
          modification: {
            targetCharacterItemId: seeded.rowId,
            kind: 'addDamageComponent',
            damageType: 'fire',
            diceCount: 1,
            diceSize: 6
          }
        })
      ])
      await resolvePlayerTurn(db,  provider,  {
        campaignId: seeded.campaignId,
        characterId: seeded.playerId,
        playerInput: 'I enchant my longsword to deal fire damage'
      }, { rng: Math.random })

      expect(getEquippedWeaponDamageProfile(db, seeded.playerId).components).toHaveLength(2)
      expect(JSON.stringify(getCatalogItemById(db, seeded.longswordId)!.mechanicalProperties)).toBe(catalogSnapshot)

      const attack = resolvePlayerAttack({
        db,
        player: getCharacterById(db, seeded.playerId)!,
        targetNpcId: seeded.npcId,
        rng: () => 0.95
      })
      expect(attack.attackResult.damageBreakdown?.components).toHaveLength(2)

      db = reopenFileTestDb(db)
      expect(listModifications(db, seeded.rowId)).toHaveLength(1)
      expect(getEquippedWeaponDamageProfile(db, seeded.playerId).components).toHaveLength(2)
    } finally {
      closeFileTestDb(db)
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
