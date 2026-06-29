/**
 * Turn routing types — see SPEC.md for disposition rules and beat ordering.
 */

export const TURN_DISPOSITIONS = ['converse', 'act', 'narrate', 'composite'] as const
export type TurnDisposition = (typeof TURN_DISPOSITIONS)[number]

export const TURN_BEAT_KINDS = [
  'npcResponse',
  'dmNarration',
  'playerActionExpression',
  'partyMember'
] as const
export type TurnBeatKind = (typeof TURN_BEAT_KINDS)[number]

export interface NpcResponseBeat {
  kind: 'npcResponse'
  npcIds: string[]
}

export interface DmNarrationBeat {
  kind: 'dmNarration'
}

export interface PlayerActionExpressionBeat {
  kind: 'playerActionExpression'
  actionDescription: string
}

export interface PartyMemberBeat {
  kind: 'partyMember'
}

export type TurnBeat =
  | NpcResponseBeat
  | DmNarrationBeat
  | PlayerActionExpressionBeat
  | PartyMemberBeat

export interface TurnRoutingPlan {
  disposition: TurnDisposition
  beats: TurnBeat[]
}

function isTurnDisposition(value: unknown): value is TurnDisposition {
  return typeof value === 'string' && (TURN_DISPOSITIONS as readonly string[]).includes(value)
}

function isNpcResponseBeat(record: Record<string, unknown>): boolean {
  if (record['kind'] !== 'npcResponse' || !Array.isArray(record['npcIds'])) {
    return false
  }
  return (record['npcIds'] as unknown[]).every((id) => typeof id === 'string')
}

function isPlayerActionExpressionBeat(record: Record<string, unknown>): boolean {
  return (
    record['kind'] === 'playerActionExpression' &&
    typeof record['actionDescription'] === 'string' &&
    record['actionDescription'].trim().length > 0
  )
}

function isTurnBeat(value: unknown): value is TurnBeat {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  if (record['kind'] === 'dmNarration') {
    return true
  }
  if (record['kind'] === 'partyMember') {
    return true
  }
  if (record['kind'] === 'npcResponse') {
    return isNpcResponseBeat(record)
  }
  if (record['kind'] === 'playerActionExpression') {
    return isPlayerActionExpressionBeat(record)
  }
  return false
}

export function isTurnRoutingPlan(value: unknown): value is TurnRoutingPlan {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  if (!isTurnDisposition(record['disposition']) || !Array.isArray(record['beats'])) {
    return false
  }
  return (record['beats'] as unknown[]).every(isTurnBeat)
}

export function sanitizeRoutingPlan(plan: TurnRoutingPlan, validNpcIds: string[]): TurnRoutingPlan {
  const validSet = new Set(validNpcIds)
  const beats = plan.beats
    .map((beat) => {
      if (beat.kind !== 'npcResponse') {
        return beat
      }
      const npcIds = beat.npcIds.filter((id) => validSet.has(id))
      return npcIds.length > 0 ? { ...beat, npcIds } : null
    })
    .filter((beat): beat is TurnBeat => beat !== null)
  return { ...plan, beats }
}
