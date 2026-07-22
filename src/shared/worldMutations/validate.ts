import {
  isRegionMutationOp,
  WORLD_MUTATION_CAUSE_MAX_CHARS,
  type NpcLifeUpdateProposal,
  type RegionMutationOp,
  type RegionStatusSnapshot,
  type RegionStatusUpdateProposal
} from './types'

function clampCause(cause: string | undefined): string | undefined {
  if (cause === undefined) {
    return undefined
  }
  const trimmed = cause.trim()
  if (trimmed.length === 0) {
    return undefined
  }
  return trimmed.length <= WORLD_MUTATION_CAUSE_MAX_CHARS
    ? trimmed
    : trimmed.slice(0, WORLD_MUTATION_CAUSE_MAX_CHARS)
}

function withCause(base: RegionStatusSnapshot, cause: string | undefined): RegionStatusSnapshot {
  return cause !== undefined ? { ...base, cause } : base
}

export function parseRegionStatusUpdate(value: unknown): RegionStatusUpdateProposal | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const body = value as Record<string, unknown>
  if (typeof body.regionId !== 'string' || body.regionId.length === 0) {
    return null
  }
  if (!isRegionMutationOp(body.op)) {
    return null
  }
  const cause = typeof body.cause === 'string' ? clampCause(body.cause) : undefined
  return cause === undefined
    ? { regionId: body.regionId, op: body.op }
    : { regionId: body.regionId, op: body.op, cause }
}

export function parseNpcLifeUpdate(value: unknown): NpcLifeUpdateProposal | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const body = value as Record<string, unknown>
  if (typeof body.npcId !== 'string' || body.npcId.length === 0) {
    return null
  }
  if (typeof body.alive !== 'boolean') {
    return null
  }
  const proposal: NpcLifeUpdateProposal = { npcId: body.npcId, alive: body.alive }
  if (typeof body.location === 'string' && body.location.trim().length > 0) {
    proposal.location = body.location.trim().slice(0, WORLD_MUTATION_CAUSE_MAX_CHARS)
  }
  if (typeof body.cause === 'string') {
    const cause = clampCause(body.cause)
    if (cause) {
      proposal.cause = cause
    }
  }
  return proposal
}

function applyDestroy(current: RegionStatusSnapshot, cause?: string): RegionStatusSnapshot {
  return withCause({ destroyed: true, damaged: false }, cause ?? current.cause)
}

function applyDamage(current: RegionStatusSnapshot, cause?: string): RegionStatusSnapshot {
  if (current.destroyed) {
    return withCause({ destroyed: true, damaged: false }, cause ?? current.cause)
  }
  return withCause({ destroyed: false, damaged: true }, cause ?? current.cause)
}

/** Pure status transition — never clears `destroyed` except via `restore`. */
export function applyRegionMutationOp(
  current: RegionStatusSnapshot,
  op: RegionMutationOp,
  cause?: string
): RegionStatusSnapshot {
  if (op === 'restore') {
    return { destroyed: false, damaged: false }
  }
  if (op === 'destroy') {
    return applyDestroy(current, cause)
  }
  return applyDamage(current, cause)
}
