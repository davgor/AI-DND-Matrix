import { findRosterEntry } from '../../engine/raceSelection/roster'
import type { CampaignRace } from './types'

export function resolveRaceDisplayLabel(
  raceKey: string | null | undefined,
  campaignRaces: CampaignRace[] = []
): string | null {
  if (!raceKey) {
    return null
  }
  const catalog = campaignRaces.find((race) => race.raceKey === raceKey)
  if (catalog) {
    return catalog.label
  }
  return findRosterEntry(raceKey)?.label ?? null
}
