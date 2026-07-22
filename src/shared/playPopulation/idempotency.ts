import type Database from 'better-sqlite3'
import { listNpcsByRegion, type Npc } from '../../db/repositories/npcs'
import { listRegionsByCampaign } from '../../db/repositories/regions'
import { namesMatch, slugifyLabel } from './slug'
import type { NpcProposal } from './types'

function findNpcByKeyInCampaign(
  db: Database.Database,
  campaignId: string,
  key: string
): Npc | undefined {
  const normalizedKey = slugifyLabel(key)
  if (!normalizedKey) {
    return undefined
  }
  for (const region of listRegionsByCampaign(db, campaignId)) {
    const match = listNpcsByRegion(db, region.id).find(
      (npc) => slugifyLabel(npc.name) === normalizedKey
    )
    if (match) {
      return match
    }
  }
  return undefined
}

/** Return an existing NPC if this proposal would duplicate a prior mint (epic 134). */
export function findExistingNpcForProposal(
  db: Database.Database,
  campaignId: string,
  regionId: string,
  proposal: Pick<NpcProposal, 'key' | 'name'>
): Npc | undefined {
  const inRegion = listNpcsByRegion(db, regionId).find((npc) => namesMatch(npc.name, proposal.name))
  if (inRegion) {
    return inRegion
  }
  if (!proposal.key) {
    return undefined
  }
  return findNpcByKeyInCampaign(db, campaignId, proposal.key)
}
