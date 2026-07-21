import type Database from 'better-sqlite3'
import { RACE_ROSTER } from '../engine/raceSelection/roster'
import { listCampaignRaces } from '../db/repositories/campaignRaces'
import type { Character } from '../db/repositories/characters'
import { listCatalogItems } from '../db/repositories/items'
import type { CompanionGeneratePcContext } from '../shared/partyMembers/types'
import { resolveCharacterStartingGear } from './guidedCreationStartingGear'

function formatGearSummary(
  gear: Array<{ name: string; equippedSlot: string | null }>
): string {
  if (gear.length === 0) {
    return 'none'
  }
  return gear.map((entry) => entry.name).join(', ')
}

export function buildCompanionGeneratePcContext(
  db: Database.Database,
  character: Character
): CompanionGeneratePcContext {
  const gearContext = resolveCharacterStartingGear(
    db,
    character.id,
    character.stats as Record<string, unknown>
  )
  return {
    playerCharacterId: character.id,
    name: character.name,
    raceKey: character.raceKey,
    backgroundKey: character.backgroundKey,
    archetype: character.characterClass,
    gearSummary: formatGearSummary(gearContext.startingGear)
  }
}

export function resolveCompanionKnownRaceKeys(
  db: Database.Database,
  campaignId: string
): string[] {
  const keys = new Set<string>()
  for (const entry of RACE_ROSTER) {
    keys.add(entry.key)
  }
  for (const race of listCampaignRaces(db, campaignId)) {
    keys.add(race.raceKey)
  }
  return [...keys]
}

export function resolveCompanionKnownInventoryItemIds(db: Database.Database): string[] {
  return listCatalogItems(db).map((item) => item.id)
}
