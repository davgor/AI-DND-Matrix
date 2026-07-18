import type { PlayAwareHubSnapshot } from '../../../shared/campaignHub/types'
import type { RegionExtras } from '../../../shared/campaign/regionExtras'
import type { Npc } from '../../../db/repositories/npcs'
import type { Region } from '../../../db/repositories/regions'

export function buildHubRegionBlocks(snapshot: PlayAwareHubSnapshot): Array<{
  region: Region
  extras: RegionExtras | undefined
  npcs: Npc[]
}> {
  const extrasById = new Map(snapshot.regionExtras.map((extras) => [extras.regionId, extras]))
  return snapshot.regions.map((region) => ({
    region,
    extras: extrasById.get(region.id),
    npcs: snapshot.npcs.filter((npc) => npc.regionId === region.id)
  }))
}

export function hubPremiseSnippet(premise: string, maxLength = 140): string {
  if (premise.length <= maxLength) {
    return premise
  }
  return `${premise.slice(0, maxLength - 1).trimEnd()}…`
}
