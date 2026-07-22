import type { ImageStyleContext } from '../imageGeneration'
import type { CreatureAppearanceTraits } from './appearance'

/** Typed request for enemy creature-token generation (species-scoped). */
export interface CreatureTokenGenerateRequest {
  speciesId: string
  campaignId: string
  speciesName: string
  appearance: CreatureAppearanceTraits
  /** Short lore slice for the prompt; may be empty. */
  loreSlice: string
  styleContext: ImageStyleContext
}
