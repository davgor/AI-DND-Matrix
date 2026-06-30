import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type {
  CombatantRef,
  CombatEncounter,
  EncounterOutcome,
  InitiativeEntry
} from '../../shared/combat/types'
import { combatantRefKey } from '../../shared/combat/types'
import type { EncounterPursuitState } from '../../shared/combat/flee/types'

interface EncounterRow {
  id: string
  campaign_id: string
  phase: 'active' | 'resolved'
  outcome: string | null
  initiative_order: string
  active_turn_index: number
  round: number
  participant_ids: string
  pursuit_state: string
  exited_combatant_ids: string
  started_at: string
  ended_at: string | null
}

function parseExitedCombatants(raw: string | null): CombatantRef[] {
  if (!raw) {
    return []
  }
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(
      (entry): entry is CombatantRef =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as CombatantRef).id === 'string' &&
        typeof (entry as CombatantRef).kind === 'string'
    )
  } catch {
    return []
  }
}

function rowToEncounter(row: EncounterRow): CombatEncounter {
  const pursuitRaw = row.pursuit_state ?? 'engaged'
  const pursuitState: EncounterPursuitState =
    pursuitRaw === 'pursued' ? 'pursued' : 'engaged'
  return {
    id: row.id,
    campaignId: row.campaign_id,
    phase: row.phase,
    outcome: (row.outcome as EncounterOutcome | null) ?? undefined,
    initiativeOrder: JSON.parse(row.initiative_order) as InitiativeEntry[],
    activeTurnIndex: row.active_turn_index,
    round: row.round,
    participantIds: JSON.parse(row.participant_ids) as CombatantRef[],
    pursuitState,
    exitedCombatantIds: parseExitedCombatants(row.exited_combatant_ids),
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined
  }
}

export function getActiveEncounter(
  db: Database.Database,
  campaignId: string
): CombatEncounter | undefined {
  const row = db
    .prepare(`SELECT * FROM combat_encounters WHERE campaign_id = ? AND phase = 'active' LIMIT 1`)
    .get(campaignId) as EncounterRow | undefined
  return row ? rowToEncounter(row) : undefined
}

export interface CreateEncounterInput {
  campaignId: string
  initiativeOrder: InitiativeEntry[]
  participantIds: CombatantRef[]
}

export function createActiveEncounter(
  db: Database.Database,
  input: CreateEncounterInput
): CombatEncounter {
  const existing = getActiveEncounter(db, input.campaignId)
  if (existing) {
    throw new Error('An active encounter already exists for this campaign')
  }
  const id = randomUUID()
  const startedAt = new Date().toISOString()
  db.prepare(
    `INSERT INTO combat_encounters
     (id, campaign_id, phase, initiative_order, active_turn_index, round, participant_ids,
      pursuit_state, exited_combatant_ids, started_at)
     VALUES (?, ?, 'active', ?, 0, 1, ?, 'engaged', '[]', ?)`
  ).run(
    id,
    input.campaignId,
    JSON.stringify(input.initiativeOrder),
    JSON.stringify(input.participantIds),
    startedAt
  )
  return {
    id,
    campaignId: input.campaignId,
    phase: 'active',
    initiativeOrder: input.initiativeOrder,
    activeTurnIndex: 0,
    round: 1,
    participantIds: input.participantIds,
    pursuitState: 'engaged',
    exitedCombatantIds: [],
    startedAt
  }
}

export function updateEncounterTurn(
  db: Database.Database,
  encounterId: string,
  activeTurnIndex: number,
  round: number
): void {
  db.prepare(
    'UPDATE combat_encounters SET active_turn_index = ?, round = ? WHERE id = ?'
  ).run(activeTurnIndex, round, encounterId)
}

export function setEncounterPursuitState(
  db: Database.Database,
  encounterId: string,
  pursuitState: EncounterPursuitState
): void {
  db.prepare('UPDATE combat_encounters SET pursuit_state = ? WHERE id = ?').run(pursuitState, encounterId)
}

export function markCombatantExited(
  db: Database.Database,
  encounterId: string,
  ref: CombatantRef,
  currentExited: CombatantRef[]
): void {
  const key = combatantRefKey(ref)
  const next = currentExited.some((entry) => combatantRefKey(entry) === key)
    ? currentExited
    : [...currentExited, ref]
  db.prepare('UPDATE combat_encounters SET exited_combatant_ids = ? WHERE id = ?').run(
    JSON.stringify(next),
    encounterId
  )
}

export function endEncounter(
  db: Database.Database,
  encounterId: string,
  outcome: EncounterOutcome
): CombatEncounter {
  const endedAt = new Date().toISOString()
  db.prepare(
    `UPDATE combat_encounters SET phase = 'resolved', outcome = ?, ended_at = ? WHERE id = ?`
  ).run(outcome, endedAt, encounterId)
  const row = db.prepare('SELECT * FROM combat_encounters WHERE id = ?').get(encounterId) as EncounterRow
  return rowToEncounter(row)
}

export function deleteEncountersForCampaign(db: Database.Database, campaignId: string): void {
  db.prepare('DELETE FROM combat_encounters WHERE campaign_id = ?').run(campaignId)
}

export function getActiveCombatant(encounter: CombatEncounter): CombatantRef {
  const entry = encounter.initiativeOrder[encounter.activeTurnIndex]
  if (!entry) {
    throw new Error('Encounter has no active combatant')
  }
  return entry.combatant
}

export function isPlayerCombatTurn(encounter: CombatEncounter, playerId: string): boolean {
  const active = getActiveCombatant(encounter)
  return active.kind === 'player' && active.id === playerId
}

export function hasCombatantExited(encounter: CombatEncounter, ref: CombatantRef): boolean {
  const key = combatantRefKey(ref)
  return encounter.exitedCombatantIds.some((entry) => combatantRefKey(entry) === key)
}

export function advanceEncounterTurnIndex(
  encounter: CombatEncounter,
  skipKeys: Set<string>
): { activeTurnIndex: number; round: number } {
  const count = encounter.initiativeOrder.length
  if (count === 0) {
    return { activeTurnIndex: 0, round: encounter.round }
  }
  let index = encounter.activeTurnIndex
  let round = encounter.round
  for (let step = 0; step < count; step += 1) {
    index = (index + 1) % count
    if (index === 0) {
      round += 1
    }
    const ref = encounter.initiativeOrder[index]?.combatant
    if (ref && !skipKeys.has(combatantRefKey(ref))) {
      return { activeTurnIndex: index, round }
    }
  }
  return { activeTurnIndex: encounter.activeTurnIndex, round: encounter.round }
}
