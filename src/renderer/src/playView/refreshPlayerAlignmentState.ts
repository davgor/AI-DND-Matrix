import type { Alignment, PendingAlignmentShift } from '../../../shared/alignment/types'

export async function refreshPlayerAlignmentState(
  campaignId: string,
  characterId: string
): Promise<{ alignment: Alignment | null; pending: PendingAlignmentShift | null }> {
  const characters = await window.characters.listByCampaign(campaignId)
  const character = characters.find((entry) => entry.id === characterId)
  return {
    alignment: character?.alignment ?? null,
    pending: character?.pendingAlignmentShift ?? null
  }
}
