import type { CampaignDetail } from '../../../main/campaignIpc'
import type { PlayAwareHubSnapshot, HubCastMember } from '../../../shared/campaignHub/types'
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

function regionNameForCharacter(
  detail: CampaignDetail,
  characterId: string
): string | null {
  const character = detail.characters.find((entry) => entry.id === characterId)
  const regionId = (character?.stats as { currentRegionId?: string } | undefined)?.currentRegionId
  if (!regionId) {
    return null
  }
  return detail.regions.find((region) => region.id === regionId)?.name ?? null
}

function buildHubCast(detail: CampaignDetail): HubCastMember[] {
  return detail.characters
    .filter((character) => character.kind === 'player')
    .map((character) => ({
      id: character.id,
      name: character.name,
      characterClass: character.characterClass,
      level: character.level,
      portraitPath: character.portraitPath,
      lifeStatus: character.lifeStatus,
      lastKnownRegionName: regionNameForCharacter(detail, character.id),
      hasObituary: character.obituary !== null,
      obituary: character.obituary ?? undefined
    }))
}

export function buildHubSnapshotFromDetail(detail: CampaignDetail): PlayAwareHubSnapshot {
  return {
    campaign: detail.campaign,
    regions: detail.regions,
    npcs: detail.npcs,
    regionExtras: detail.regionExtras,
    storyThreads: detail.storyThreads,
    characters: detail.characters,
    currentStateSummary: detail.campaign?.currentStateSummary ?? '',
    recentEvents: [],
    cast: buildHubCast(detail),
    questSummariesByCharacterId: [],
    regionQuestAvailability: detail.regions.map((region) => ({
      regionId: region.id,
      availableQuestCount: 0
    }))
  }
}
