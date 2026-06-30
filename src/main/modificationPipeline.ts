import type Database from 'better-sqlite3'
import { validateModification } from '../engine/modificationValidation'
import { appendEvent } from '../db/repositories/events'
import { addModification, listModifications } from '../db/repositories/characterItemModifications'
import {
  buildWeaponDamageProfile,
  findOwnedCharacterItem
} from '../db/repositories/weaponDamageProfile'
import type { ItemModificationProposal } from '../shared/weaponModifications/types'
import { getCatalogItemById } from '../db/repositories/items'

export interface PersistModificationResult {
  ok: true
  modificationId: string
  narrationText: string
  summary: string
}

export interface PersistModificationFailure {
  ok: false
  reason: string
}

export function persistValidatedModification(input: {
  db: Database.Database
  campaignId: string
  characterId: string
  proposal: ItemModificationProposal
  narrationText: string
}): PersistModificationResult | PersistModificationFailure {
  const { db, campaignId, characterId, proposal, narrationText } = input
  const owned = findOwnedCharacterItem(db, characterId, proposal.targetCharacterItemId)
  if (!owned || owned.item.mechanicalProperties.kind !== 'weapon') {
    return { ok: false, reason: 'Invalid weapon target' }
  }
  const profile = buildWeaponDamageProfile(db, owned)
  if (!profile) {
    return { ok: false, reason: 'Could not build weapon profile' }
  }
  const existing = listModifications(db, owned.id)
  const validated = validateModification(profile, existing, proposal)
  if (!validated.ok) {
    return { ok: false, reason: validated.reason }
  }
  const payload = proposalToPayload(validated.proposal)
  if (!payload) {
    return { ok: false, reason: 'Invalid modification payload' }
  }
  const saved = addModification(db, owned.id, validated.proposal.kind, payload)
  const catalogBefore = getCatalogItemById(db, owned.itemId)
  appendEvent(db, {
    campaignId,
    type: 'item_modified',
    payload: {
      characterItemId: owned.id,
      catalogItemId: owned.itemId,
      modificationId: saved.id,
      kind: saved.kind,
      payload: saved.payload,
      catalogItemUnchanged: catalogBefore?.mechanicalProperties
    }
  })
  const refreshed = buildWeaponDamageProfile(db, owned)!
  const summary = refreshed.components
    .map((c) => `${c.damageRoll.diceCount}d${c.damageRoll.diceSize} ${c.damageType}`)
    .join(' + ')
  return { ok: true, modificationId: saved.id, narrationText, summary }
}

function proposalToPayload(
  proposal: ItemModificationProposal
): import('../shared/weaponModifications/types').ItemModificationPayload | null {
  if (proposal.kind === 'addDamageComponent') {
    if (!proposal.damageType || proposal.diceCount === undefined || proposal.diceSize === undefined) {
      return null
    }
    return {
      damageType: proposal.damageType,
      diceCount: proposal.diceCount,
      diceSize: proposal.diceSize
    }
  }
  if (proposal.kind === 'setDescription' && proposal.description) {
    return { description: proposal.description }
  }
  if (proposal.kind === 'setDisplayName' && proposal.displayName) {
    return { displayName: proposal.displayName }
  }
  return null
}

export function catalogItemMechanicalEquals(
  db: Database.Database,
  itemId: string,
  snapshot: unknown
): boolean {
  const item = getCatalogItemById(db, itemId)
  if (!item) {
    return false
  }
  return JSON.stringify(item.mechanicalProperties) === JSON.stringify(snapshot)
}
