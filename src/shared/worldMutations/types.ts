/** Hard world mutations — typed proposals + digest budgets (epic 130). */

export const REGION_MUTATION_OPS = ['destroy', 'damage', 'restore'] as const
export type RegionMutationOp = (typeof REGION_MUTATION_OPS)[number]

export const WORLD_MUTATION_CAUSE_MAX_CHARS = 120 as const
export const WORLD_MUTATION_DIGEST_MAX_CHARS = 280 as const
export const WORLD_MUTATION_DIGEST_MAX_NPC_LINES = 4 as const
export const WORLD_MUTATION_DIGEST_LINE_MAX_CHARS = 100 as const

/** Mirrors `regions.status` JSON; `damaged` is optional for legacy rows. */
export interface RegionStatusSnapshot {
  destroyed: boolean
  damaged?: boolean
  cause?: string
}

export interface RegionStatusUpdateProposal {
  regionId: string
  op: RegionMutationOp
  cause?: string
}

export interface NpcLifeUpdateProposal {
  npcId: string
  alive: boolean
  location?: string
  cause?: string
}

export function isRegionMutationOp(value: unknown): value is RegionMutationOp {
  return typeof value === 'string' && (REGION_MUTATION_OPS as readonly string[]).includes(value)
}
