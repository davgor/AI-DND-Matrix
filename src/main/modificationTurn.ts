import type Database from 'better-sqlite3'
import type { Provider } from '../agents/providers/types'
import { resolveItemModification } from '../agents/itemModification'
import { listCharacterItems } from '../db/repositories/characterItems'
import { getEquippedWeaponDamageProfile } from '../db/repositories/weaponDamageProfile'
import { createSaveSnapshot } from '../db/repositories/saves'
import type { Character } from '../db/repositories/characters'
import { persistValidatedModification } from './modificationPipeline'
import type { TurnResult } from './turnIpc'

export async function resolveModificationTurn(input: {
  db: Database.Database
  provider: Provider
  campaignId: string
  character: Character
  playerInput: string
}): Promise<TurnResult> {
  const { db, provider, campaignId, character, playerInput } = input
  const ownedWeapons = listCharacterItems(db, character.id).filter(
    (row) => row.item.mechanicalProperties.kind === 'weapon'
  )
  const equippedWeapon = getEquippedWeaponDamageProfile(db, character.id)
  const agent = await resolveItemModification(provider, {
    playerInput,
    ownedWeapons,
    equippedWeapon: equippedWeapon.characterItemId ? equippedWeapon : undefined
  })
  const persisted = persistValidatedModification({
    db,
    campaignId,
    characterId: character.id,
    proposal: agent.modification,
    narrationText: agent.narrationText
  })
  if (!persisted.ok) {
    return {
      narrationText: `The enchantment fails to take hold (${persisted.reason}).`,
      npcReactions: [],
      partyMemberActions: [],
      pendingAlignmentShift: null
    }
  }
  createSaveSnapshot(db, campaignId)
  return {
    narrationText: persisted.narrationText,
    npcReactions: [],
    partyMemberActions: [],
    pendingAlignmentShift: null,
    itemModification: {
      characterItemId: agent.modification.targetCharacterItemId,
      kind: agent.modification.kind,
      summary: persisted.summary
    }
  }
}
