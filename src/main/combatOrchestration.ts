import type Database from 'better-sqlite3'
import type { RandomFn } from '../engine/abilities'
import { rollInitiative, type Combatant } from '../engine/combat'
import type {
  CombatantRef,
  CombatEncounter,
  EncounterOutcome
} from '../shared/combat/types'
import { engineInitiativeToShared } from '../shared/combat/types'
import {
  createActiveEncounter,
  endEncounter as persistEndEncounter,
  getActiveCombatant,
  hasCombatantExited,
  updateEncounterTurn,
  type CombatEncounter as StoredEncounter
} from '../db/repositories/combatEncounters'
import { appendEvent } from '../db/repositories/events'
import { ensureNpcCombatStats, hydrateNpcWithFallback } from '../db/repositories/npcCombatHydration'
import {
  getNpcById,
  isHostileNpc,
  isNpcOutOfFight,
  listNpcsByRegion,
  setNpcEncounterOutcome,
  updateNpcDisposition,
  type Npc
} from '../db/repositories/npcs'
import type { NpcYieldOutcome } from '../shared/combat/types'
import { listPartyMembersForPlayer, getCharacterById, type Character } from '../db/repositories/characters'

export interface StartEncounterInput {
  db: Database.Database
  campaignId: string
  regionId: string
  player: Character
  participantNpcIds?: string[]
  rng: RandomFn
}

export function collectEncounterCombatants(
  db: Database.Database,
  regionId: string,
  player: Character,
  participantNpcIds?: string[]
): CombatantRef[] {
  const refs: CombatantRef[] = [{ kind: 'player', id: player.id }]
  const partyMembers = listPartyMembersForPlayer(db, player.id)
  for (const member of partyMembers) {
    refs.push({ kind: 'ai_party_member', id: member.id })
  }
  const npcIds =
    participantNpcIds ??
    listNpcsByRegion(db, regionId)
      .filter((npc) => isHostileNpc(npc) && !isNpcOutOfFight(npc))
      .map((npc) => npc.id)
  for (const npcId of npcIds) {
    refs.push({ kind: 'npc', id: npcId })
  }
  return refs
}

export function startEncounter(input: StartEncounterInput): CombatEncounter {
  const { db, campaignId, regionId, player, participantNpcIds, rng } = input
  const participantRefs = collectEncounterCombatants(db, regionId, player, participantNpcIds)
  for (const ref of participantRefs) {
    if (ref.kind === 'npc') {
      const npc = getNpcById(db, ref.id)
      if (npc) {
        hydrateNpcWithFallback(db, npc.id)
      }
    }
  }

  const kindById = new Map(participantRefs.map((ref) => [ref.id, ref.kind]))
  const engineCombatants: Combatant[] = participantRefs.map((ref) => ({
    id: ref.id,
    agilityScore: resolveAgilityScore(db, ref, player)
  }))
  const rolled = rollInitiative(engineCombatants, rng)
  const initiativeOrder = engineInitiativeToShared(rolled, kindById)

  const encounter = createActiveEncounter(db, {
    campaignId,
    initiativeOrder,
    participantIds: participantRefs
  })

  appendEvent(db, {
    campaignId,
    type: 'combat_started',
    payload: {
      encounterId: encounter.id,
      participantIds: participantRefs,
      initiativeOrder
    }
  })

  return skipToActiveCombatant(db, encounter, participantRefs)
}

function resolveAgilityScore(db: Database.Database, ref: CombatantRef, player: Character): number {
  if (ref.kind === 'player' && ref.id === player.id) {
    const scores = (player.stats as { abilityScores?: { agility?: number } }).abilityScores
    return scores?.agility ?? 10
  }
  if (ref.kind === 'ai_party_member') {
    const member = getCharacterById(db, ref.id)
    const scores = (member?.stats as { abilityScores?: { agility?: number } })?.abilityScores
    return scores?.agility ?? 10
  }
  return 10
}

export function isCombatantSkipped(db: Database.Database, ref: CombatantRef, encounter?: StoredEncounter): boolean {
  if (encounter && hasCombatantExited(encounter, ref)) {
    return true
  }
  if (ref.kind === 'npc') {
    const npc = getNpcById(db, ref.id)
    return !npc || isNpcOutOfFight(npc)
  }
  const character = getCharacterById(db, ref.id)
  if (!character) {
    return true
  }
  const dying = (character.stats as { dyingState?: { unconscious?: boolean } }).dyingState
  return character.hp <= 0 || dying?.unconscious === true
}

export function advanceEncounterTurn(
  db: Database.Database,
  encounter: StoredEncounter,
  _participantRefs: CombatantRef[]
): StoredEncounter {
  const orderLength = encounter.initiativeOrder.length
  if (orderLength === 0) {
    return encounter
  }
  let index = encounter.activeTurnIndex
  let round = encounter.round
  for (let step = 0; step < orderLength; step += 1) {
    index += 1
    if (index >= orderLength) {
      index = 0
      round += 1
    }
    const ref = encounter.initiativeOrder[index]?.combatant
    if (ref && !isCombatantSkipped(db, ref, encounter)) {
      updateEncounterTurn(db, encounter.id, index, round)
      return { ...encounter, activeTurnIndex: index, round }
    }
  }
  return encounter
}

function skipToActiveCombatant(
  db: Database.Database,
  encounter: StoredEncounter,
  participantRefs: CombatantRef[]
): StoredEncounter {
  const active = getActiveCombatant(encounter)
  if (!isCombatantSkipped(db, active, encounter)) {
    return encounter
  }
  return advanceEncounterTurn(db, encounter, participantRefs)
}

export function allHostilesDefeated(db: Database.Database, encounter: StoredEncounter): boolean {
  const hostileNpcRefs = encounter.participantIds.filter((ref) => ref.kind === 'npc')
  return hostileNpcRefs.every((ref) => {
    const npc = getNpcById(db, ref.id)
    return !npc || isNpcOutOfFight(npc)
  })
}

export function finalizeEncounter(
  db: Database.Database,
  encounter: StoredEncounter,
  outcome: EncounterOutcome
): StoredEncounter {
  for (const ref of encounter.participantIds) {
    if (ref.kind !== 'npc') {
      continue
    }
    const npc = ensureNpcCombatStats(db, getNpcById(db, ref.id) as Npc)
    if (npc.hp !== null && npc.hp <= 0 && npc.encounterOutcome === null) {
      setNpcEncounterOutcome(db, ref.id, 'slain')
    }
  }
  const ended = persistEndEncounter(db, encounter.id, outcome)
  appendEvent(db, {
    campaignId: encounter.campaignId,
    type: 'combat_ended',
    payload: {
      encounterId: encounter.id,
      outcome,
      survivors: encounter.participantIds
    }
  })
  return ended
}

const YIELD_OUTCOME_EVENT_TYPES: Record<NpcYieldOutcome, string> = {
  surrender: 'npc_surrendered',
  flee: 'npc_fled_combat',
  incapacitated: 'npc_incapacitated',
  slain: 'npc_slain'
}

export function applyNpcYieldOutcome(
  db: Database.Database,
  campaignId: string,
  npcId: string,
  opts: { outcome: NpcYieldOutcome; narrationHint: string }
): void {
  const { outcome, narrationHint } = opts
  setNpcEncounterOutcome(db, npcId, outcome)
  if (outcome === 'surrender') {
    updateNpcDisposition(db, npcId, 'subdued — surrendered to the player')
  }
  const eventType = YIELD_OUTCOME_EVENT_TYPES[outcome]
  appendEvent(db, {
    campaignId,
    type: eventType,
    payload: { npcId, outcome, narrationHint }
  })
}

export function appendCombatTurnAdvanced(
  db: Database.Database,
  encounter: StoredEncounter
): void {
  const active = getActiveCombatant(encounter)
  appendEvent(db, {
    campaignId: encounter.campaignId,
    type: 'combat_turn_advanced',
    payload: {
      encounterId: encounter.id,
      activeCombatant: active,
      round: encounter.round
    }
  })
}
