export interface CampaignReviewSnapshot {
  regions: ReadonlyArray<{ id: string }>
  npcs: ReadonlyArray<unknown>
}

export type CampaignReviewContinueBlocker = 'no-regions' | 'no-npcs'

export function getCampaignReviewContinueBlockers(
  detail: CampaignReviewSnapshot
): CampaignReviewContinueBlocker[] {
  const blockers: CampaignReviewContinueBlocker[] = []
  if (detail.regions.length === 0) {
    blockers.push('no-regions')
  }
  if (detail.npcs.length === 0) {
    blockers.push('no-npcs')
  }
  return blockers
}

export function canContinueCampaignReview(detail: CampaignReviewSnapshot): boolean {
  return getCampaignReviewContinueBlockers(detail).length === 0
}

export function campaignReviewContinueMessage(
  blockers: CampaignReviewContinueBlocker[]
): string | null {
  if (blockers.length === 0) {
    return null
  }
  if (blockers.includes('no-regions') && blockers.includes('no-npcs')) {
    return 'Add at least one region and one NPC before continuing.'
  }
  if (blockers.includes('no-regions')) {
    return 'Add at least one region before continuing.'
  }
  return 'Add at least one NPC before continuing.'
}
