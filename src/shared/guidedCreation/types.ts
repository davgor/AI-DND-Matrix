export const GUIDED_CREATION_PHASES = ['none', 'race', 'background', 'equipment', 'identity', 'opening_scene', 'complete'] as const
export type GuidedCreationPhase = (typeof GUIDED_CREATION_PHASES)[number]

export const GUIDED_MESSAGE_PHASES = ['identity', 'opening_scene'] as const
export type GuidedMessagePhase = (typeof GUIDED_MESSAGE_PHASES)[number]

export type GuidedMessageRole = 'player' | 'dm'

export const IDENTITY_FOUNDATIONS = ['who', 'why', 'where', 'what'] as const
export type IdentityFoundation = (typeof IDENTITY_FOUNDATIONS)[number]

export interface FoundationStatus {
  complete: boolean
  summary?: string
}

export type IdentityFoundationsStatus = Record<IdentityFoundation, FoundationStatus>

export interface GuidedCreationMessage {
  id: string
  campaignId: string
  characterId: string
  phase: GuidedMessagePhase
  role: GuidedMessageRole
  content: string
  createdAt: string
}

export interface CharacterGuidedCreationFields {
  identityWho: string | null
  identityWhy: string | null
  identityWhere: string | null
  identityWhat: string | null
  openingScene: string | null
  guidedCreationPhase: GuidedCreationPhase
}

export interface IdentityFoundationSpec {
  key: IdentityFoundation
  label: string
  meaning: string
}

export const IDENTITY_FOUNDATION_SPECS: IdentityFoundationSpec[] = [
  { key: 'who', label: 'Who', meaning: 'Name, lineage, appearance, and personal history the character claims.' },
  { key: 'why', label: 'Why', meaning: 'Purpose, motivation, and what drives them into this story.' },
  {
    key: 'where',
    label: 'Where',
    meaning: 'Origin/homeland plus which generated campaign region they start play in.'
  },
  { key: 'what', label: 'What', meaning: 'Nature, role, skills, and defining traits beyond raw stats.' }
]

export interface GuidedCreationSendMessageInput {
  campaignId: string
  characterId: string
  phase: GuidedMessagePhase
  message: string
}

export interface GuidedCreationKickoffInput {
  campaignId: string
  characterId: string
}

import type { RevertibleOnboardingPhase } from './revertPhase'

export type GuidedCreationRevertPhaseInput = {
  characterId: string
  targetPhase: RevertibleOnboardingPhase
}

export type GuidedCreationRevertPhaseResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'invalid_revert' }

export interface GuidedCreationKickoffSuccess {
  ok: true
  kickedOff: boolean
}

export interface GuidedCreationKickoffFailure {
  ok: false
  reason: GuidedCreationFailureReason
}

export type GuidedCreationKickoffResult = GuidedCreationKickoffSuccess | GuidedCreationKickoffFailure

export type GuidedCreationFailureReason =
  | 'not_found'
  | 'invalid_phase'
  | 'schema_error'
  | 'provider_error'
  | 'empty_message'

export interface GuidedCreationGenerateReplyInput {
  campaignId: string
  characterId: string
  phase: GuidedMessagePhase
  /** Optional composer text to revise into a stronger reply. */
  existingDraft?: string | null
}

export type GuidedCreationGenerateReplyResult =
  | { ok: true; reply: string }
  | { ok: false; reason: GuidedCreationFailureReason }

export interface GuidedCreationSendMessageSuccess {
  ok: true
  dmReply: string
  guidedCreationPhase: GuidedCreationPhase
  foundations?: IdentityFoundationsStatus
  allFoundationsComplete?: boolean
  sceneReady?: boolean
  proposedOpeningScene?: string | null
}

export interface GuidedCreationSendMessageFailure {
  ok: false
  reason: GuidedCreationFailureReason
}

export type GuidedCreationSendMessageResult =
  | GuidedCreationSendMessageSuccess
  | GuidedCreationSendMessageFailure

export interface GuidedCreationReadyToEnterPlayInput {
  campaignId: string
  characterId: string
}

export type GuidedCreationReadyToEnterPlayResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'invalid_phase' }

export interface GuidedCreationState {
  guidedCreationPhase: GuidedCreationPhase
  foundations: IdentityFoundationsStatus
  openingScene: string | null
  alignment: import('../alignment/types').Alignment | null
  messages: GuidedCreationMessage[]
}
