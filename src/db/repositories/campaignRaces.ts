import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type {
  CampaignRace,
  CreateCampaignRaceInput,
  RaceLore
} from '../../shared/raceSelection/types'

interface CampaignRaceRow {
  id: string
  campaign_id: string
  race_key: string
  kind: 'preset' | 'custom'
  label: string
  seed_prompt: string
  lore: string
  created_by_character_id: string | null
  created_at: string
}

function parseLoreJson(raw: string): RaceLore {
  return JSON.parse(raw) as RaceLore
}

function rowToCampaignRace(row: CampaignRaceRow): CampaignRace {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    raceKey: row.race_key,
    kind: row.kind,
    label: row.label,
    seedPrompt: row.seed_prompt,
    lore: parseLoreJson(row.lore),
    createdByCharacterId: row.created_by_character_id,
    createdAt: row.created_at
  }
}

export function createCampaignRace(
  db: Database.Database,
  input: CreateCampaignRaceInput
): CampaignRace {
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  db.prepare(
    `INSERT INTO campaign_races
       (id, campaign_id, race_key, kind, label, seed_prompt, lore, created_by_character_id, created_at)
     VALUES
       (@id, @campaignId, @raceKey, @kind, @label, @seedPrompt, @lore, @createdByCharacterId, @createdAt)`
  ).run({
    id,
    campaignId: input.campaignId,
    raceKey: input.raceKey,
    kind: input.kind,
    label: input.label,
    seedPrompt: input.seedPrompt,
    lore: JSON.stringify(input.lore),
    createdByCharacterId: input.createdByCharacterId ?? null,
    createdAt
  })
  return getCampaignRaceByKey(db, input.campaignId, input.raceKey)!
}

// Referential integrity for characters.race_key / npcs.race_key is enforced in the
// repository layer by always looking up (campaignId, raceKey) together — no SQL FK.
export function getCampaignRaceByKey(
  db: Database.Database,
  campaignId: string,
  raceKey: string
): CampaignRace | undefined {
  const row = db
    .prepare('SELECT * FROM campaign_races WHERE campaign_id = ? AND race_key = ?')
    .get(campaignId, raceKey) as CampaignRaceRow | undefined
  return row ? rowToCampaignRace(row) : undefined
}

export function listCampaignRaces(db: Database.Database, campaignId: string): CampaignRace[] {
  const rows = db
    .prepare('SELECT * FROM campaign_races WHERE campaign_id = ? ORDER BY label')
    .all(campaignId) as CampaignRaceRow[]
  return rows.map(rowToCampaignRace)
}

export function setCharacterRaceKey(
  db: Database.Database,
  characterId: string,
  raceKey: string
): void {
  db.prepare('UPDATE characters SET race_key = ? WHERE id = ?').run(raceKey, characterId)
}
