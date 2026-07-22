import type Database from 'better-sqlite3'
import { getNpcById, updateNpcStatus } from '../db/repositories/npcs'
import { getRegionById, updateRegionStatus } from '../db/repositories/regions'
import {
  applyRegionMutationOp,
  filterIllegalRegionMutations,
  guardSceneUpdateForDestroyedRegion,
  parseNpcLifeUpdate,
  parseRegionStatusUpdate,
  type NpcLifeUpdateProposal,
  type RegionStatusUpdateProposal
} from '../shared/worldMutations'
import type { NarrationResult } from './dm'

export interface WorldMutationSideEffectInput {
  campaignId: string
  regionId: string
}

function persistOneRegionUpdate(
  db: Database.Database,
  campaignId: string,
  update: RegionStatusUpdateProposal
): void {
  const region = getRegionById(db, update.regionId)
  if (!region || region.campaignId !== campaignId) {
    return
  }
  const next = applyRegionMutationOp(region.status, update.op, update.cause)
  updateRegionStatus(db, region.id, next)
}

function persistOneNpcLifeUpdate(
  db: Database.Database,
  campaignId: string,
  update: NpcLifeUpdateProposal
): void {
  const npc = getNpcById(db, update.npcId)
  if (!npc || npc.campaignId !== campaignId) {
    return
  }
  updateNpcStatus(db, npc.id, {
    ...npc.status,
    alive: update.alive,
    ...(update.location !== undefined ? { location: update.location } : {})
  })
}

/**
 * Apply typed region/NPC mutations from narration. Invalid FKs are ignored.
 * Also strips illegal pristine sceneUpdate when the current region is destroyed.
 */
export function persistWorldMutationSideEffects(
  db: Database.Database,
  result: NarrationResult,
  input: WorldMutationSideEffectInput
): { sceneUpdate?: string } {
  const currentRegion = getRegionById(db, input.regionId)
  const currentStatus = currentRegion?.status ?? { destroyed: false }

  const parsedRegion = (result.regionStatusUpdates ?? [])
    .map(parseRegionStatusUpdate)
    .filter((u): u is RegionStatusUpdateProposal => u !== null)
  const regionUpdates = filterIllegalRegionMutations(currentStatus, parsedRegion)

  for (const update of regionUpdates) {
    persistOneRegionUpdate(db, input.campaignId, update)
  }

  const npcUpdates = (result.npcLifeUpdates ?? [])
    .map(parseNpcLifeUpdate)
    .filter((u): u is NpcLifeUpdateProposal => u !== null)
  for (const update of npcUpdates) {
    persistOneNpcLifeUpdate(db, input.campaignId, update)
  }

  const sceneUpdate = guardSceneUpdateForDestroyedRegion(
    currentStatus,
    result.sceneUpdate,
    regionUpdates
  )
  return sceneUpdate !== undefined ? { sceneUpdate } : {}
}
