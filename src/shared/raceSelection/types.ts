export type RaceCategory =
  | 'common_folk'
  | 'outsider_bloodlines'
  | 'monstrous_feral'
  | 'uncanny_otherworldly'

export interface RaceRosterEntry {
  key: string
  label: string
  category: RaceCategory
  seedPrompt: string
}

export interface RaceLore {
  summary: string
  appearance: string
  culture: string
  roleInThisLand: string
  hooks: string[]
}

export type RaceLoreInput =
  | { kind: 'preset'; raceKey: string; label: string; seedPrompt: string }
  | { kind: 'custom'; label: string; seedPrompt: string }

export interface AvailableRaceOption {
  key: string
  label: string
  blurb: string
}

export interface CampaignRace {
  id: string
  campaignId: string
  raceKey: string
  kind: 'preset' | 'custom'
  label: string
  seedPrompt: string
  lore: RaceLore
  createdByCharacterId: string | null
  createdAt: string
}

export interface CreateCampaignRaceInput {
  campaignId: string
  raceKey: string
  kind: 'preset' | 'custom'
  label: string
  seedPrompt: string
  lore: RaceLore
  createdByCharacterId?: string | null
}

export interface RacePreviewLoreResult {
  locked: boolean
  lore: RaceLore
}

export interface RaceApplyInput {
  campaignId: string
  characterId: string
  kind: 'preset' | 'custom'
  raceKey?: string
  label: string
  seedPrompt: string
  finalLore: RaceLore
}

export type RaceApplyResult =
  | { ok: true; raceKey: string }
  | { ok: false; reason: 'invalid_phase' | 'invalid_race_key' | 'character_not_found' }
