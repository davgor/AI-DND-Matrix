import type Database from 'better-sqlite3'
import { abilityModifier } from '../../engine/abilities'
import type { DamageRoll } from '../../engine/damage'
import { getNpcCombatStats, getVillagerCombatStats } from '../../engine/npcCombatStats'
import { getCreatureByKey } from '../catalog/creatures'
import type { Npc } from './npcs'

export interface NpcAttackProfile {
  attackBonus: number
  damageRoll: DamageRoll
}

export function resolveNpcAttackProfile(db: Database.Database, npc: Npc): NpcAttackProfile {
  if (npc.attackBonus !== null && npc.damageRoll) {
    return { attackBonus: npc.attackBonus, damageRoll: npc.damageRoll }
  }
  if (npc.catalogCreatureKey) {
    const creature = getCreatureByKey(db, npc.catalogCreatureKey)
    if (creature) {
      return {
        attackBonus: abilityModifier(creature.abilities.agility) + 2,
        damageRoll: { diceCount: 1, diceSize: 6, modifier: 0 }
      }
    }
  }
  if (npc.combatTier === 'retired_adventurer' && npc.retiredAdventurerProfile) {
    const stats = getNpcCombatStats('retired_adventurer', npc.retiredAdventurerProfile)
    return { attackBonus: stats.attackBonus, damageRoll: stats.damageRoll }
  }
  const villager = getVillagerCombatStats()
  return { attackBonus: villager.attackBonus, damageRoll: villager.damageRoll }
}
