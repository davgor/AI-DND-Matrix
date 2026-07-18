export interface CampaignPlaySnapshot {
  regions: ReadonlyArray<{ id: string; name: string }>
  npcs: ReadonlyArray<{ regionId: string }>
}

export type CampaignPlayBlocker = 'empty-region'

export interface CampaignPlayBlockerDetail {
  kind: CampaignPlayBlocker
  regionId: string
  regionName: string
}

export function getCampaignPlayBlockers(detail: CampaignPlaySnapshot): CampaignPlayBlockerDetail[] {
  return detail.regions
    .filter((region) => detail.npcs.filter((npc) => npc.regionId === region.id).length === 0)
    .map((region) => ({
      kind: 'empty-region' as const,
      regionId: region.id,
      regionName: region.name
    }))
}

export function canEnterCampaignPlay(detail: CampaignPlaySnapshot): boolean {
  return getCampaignPlayBlockers(detail).length === 0
}

/** Hub resume (038.6 / 038.12) should call the same guard before entering play. */
export function campaignPlayBlockerMessage(
  blockers: CampaignPlayBlockerDetail[]
): string | null {
  if (blockers.length === 0) {
    return null
  }
  if (blockers.length === 1) {
    return `Generate at least one NPC for ${blockers[0]!.regionName} on the campaign review screen before entering play.`
  }
  const names = blockers.map((blocker) => blocker.regionName).join(', ')
  return `Every region needs at least one NPC before play. Still empty: ${names}. Return to campaign review to generate NPCs.`
}

export function guardPlayEntry(
  detail: CampaignPlaySnapshot,
  setEnterPlayBlockerMessage: (message: string | null) => void
): boolean {
  const blockers = getCampaignPlayBlockers(detail)
  if (!canEnterCampaignPlay(detail)) {
    setEnterPlayBlockerMessage(campaignPlayBlockerMessage(blockers))
    return false
  }
  return true
}
