import type Database from 'better-sqlite3'
import { reviewRetiredAdventurer } from '../../agents/retiredAdventurerReview'
import type { Provider } from '../../agents/providers/types'
import { getNpcCombatStats } from '../../engine/npcCombatStats'
import type { CatalogCreature } from '../catalog/types'
import {
  applyRetiredAdventurerUpgrade,
  createNpc,
  getNpcById,
  hydrateNpcVillagerTier,
  npcHasCombatStats,
  setNpcCombatStats,
  type CreateNpcInput,
  type Npc
} from './npcs'

export function hydrateNpcFromCatalog(db: Database.Database, npcId: string, creature: CatalogCreature): void {
  const npc = getNpcById(db, npcId)
  if (!npc || npc.catalogCreatureKey || npcHasCombatStats(npc)) {
    return
  }
  setNpcCombatStats(db, npcId, {
    hp: creature.hp,
    maxHp: creature.hp,
    ac: creature.ac,
    catalogCreatureKey: creature.key,
    temperament: creature.temperament,
    canSpeak: creature.canSpeak,
    combatTier: 'catalog'
  })
}

export function hydrateNpcWithFallback(db: Database.Database, npcId: string): void {
  const npc = getNpcById(db, npcId)
  if (!npc || npcHasCombatStats(npc) || npc.catalogCreatureKey) {
    return
  }
  if (npc.combatTier === 'retired_adventurer' && npc.retiredAdventurerProfile) {
    const stats = getNpcCombatStats('retired_adventurer', npc.retiredAdventurerProfile)
    setNpcCombatStats(db, npcId, {
      hp: stats.hp,
      maxHp: stats.maxHp,
      ac: stats.ac,
      attackBonus: stats.attackBonus,
      damageRoll: stats.damageRoll,
      combatTier: 'retired_adventurer'
    })
    return
  }
  hydrateNpcVillagerTier(db, npcId)
}

export function ensureNpcCombatStats(db: Database.Database, npc: Npc): Npc {
  if (!npcHasCombatStats(npc)) {
    hydrateNpcWithFallback(db, npc.id)
    return getNpcById(db, npc.id) ?? npc
  }
  return npc
}

export async function createNpcWithCombatReview(
  db: Database.Database,
  provider: Provider,
  input: CreateNpcInput
): Promise<Npc> {
  const npc = createNpc(db, input)
  if (!npc.canSpeak || !npc.backstory.trim()) {
    return npc
  }
  const review = await reviewRetiredAdventurer(provider, npc)
  if (review.upgrade && review.profile) {
    applyRetiredAdventurerUpgrade(db, npc.id, review.profile)
    return getNpcById(db, npc.id) as Npc
  }
  return npc
}
