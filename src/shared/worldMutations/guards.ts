import type { RegionStatusSnapshot, RegionStatusUpdateProposal } from './types'

/**
 * Drop region updates that would illegally revive a destroyed place.
 * Typed ops only revive via `restore`; this filters malformed / future payloads
 * that claim a non-restore clear of destroyed.
 */
export function filterIllegalRegionMutations(
  current: RegionStatusSnapshot,
  updates: RegionStatusUpdateProposal[]
): RegionStatusUpdateProposal[] {
  if (!current.destroyed) {
    return updates
  }
  return updates.filter((update) => update.op === 'restore' || update.op === 'destroy' || update.op === 'damage')
}

/** True when grounding must forbid pristine assumptions about this region. */
export function regionRequiresDestroyedGuard(status: RegionStatusSnapshot): boolean {
  return status.destroyed === true
}

/**
 * When the region is destroyed and the turn does not propose restore,
 * strip a sceneUpdate that would otherwise invent a pristine place rewrite.
 * Conservative: any sceneUpdate without an accompanying restore is dropped.
 */
export function guardSceneUpdateForDestroyedRegion(
  status: RegionStatusSnapshot,
  sceneUpdate: string | undefined,
  regionUpdates: RegionStatusUpdateProposal[] | undefined
): string | undefined {
  if (!status.destroyed || sceneUpdate === undefined) {
    return sceneUpdate
  }
  const hasRestore = (regionUpdates ?? []).some((update) => update.op === 'restore')
  return hasRestore ? sceneUpdate : undefined
}
