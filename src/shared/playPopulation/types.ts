import type { Alignment, Temperament } from '../alignment/types'

/** Max NPC mint proposals applied per narration side-effect pass (epic 134). */
export const MAX_NPC_PROPOSALS_PER_TURN = 2 as const

export const NPC_MINT_PURPOSES = ['introduced_in_scene', 'background_presence'] as const
export type NpcMintPurpose = (typeof NPC_MINT_PURPOSES)[number]

/** Typed DM proposal to mint a new NPC during play. */
export interface NpcProposal {
  key?: string
  name: string
  role: string
  disposition: string
  backstory?: string
  regionId?: string
  regionKey?: string
  canSpeak?: boolean
  temperament?: Temperament
  alignment?: Alignment | null
  raceKey?: string | null
  backgroundKey?: string | null
  genderKey?: string | null
  classKey?: string | null
  factionId?: string
  factionKey?: string
  factionMembershipRole?: string | null
  purpose?: NpcMintPurpose
}

/** Reserved for epic 142 — not persisted in v1. */
export interface PlaceProposal {
  key: string
  name: string
  description: string
  parentRegionId?: string
  parentRegionKey?: string
}

export function isNpcMintPurpose(value: unknown): value is NpcMintPurpose {
  return typeof value === 'string' && (NPC_MINT_PURPOSES as readonly string[]).includes(value)
}
