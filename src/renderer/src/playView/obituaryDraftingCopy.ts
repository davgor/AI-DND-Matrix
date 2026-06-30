import type { GenerateObituaryResult } from '../../../shared/campaignHub/obituary'
import { OBITUARY_GENERATION_FAILED_MESSAGE } from '../../../shared/campaignHub/obituary'

export const OBITUARY_DRAFTING_COPY = 'Drafting your obituary'

type ObituaryModalPhase = 'generating' | 'ready' | 'failed'

export function obituaryModalBodyCopy(phase: ObituaryModalPhase): string {
  if (phase === 'generating') {
    return OBITUARY_DRAFTING_COPY
  }
  if (phase === 'failed') {
    return OBITUARY_GENERATION_FAILED_MESSAGE
  }
  return ''
}

export interface ObituaryDraftingRequest {
  campaignId: string
  characterId: string
  deathCause?: string
}

export type { GenerateObituaryResult }
