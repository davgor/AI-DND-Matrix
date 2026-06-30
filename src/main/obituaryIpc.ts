import type Database from 'better-sqlite3'
import {
  assembleObituaryContext,
  enrichObituaryNpcNames,
  generateObituary,
  persistObituaryOnDeath
} from '../agents/obituary'
import type { Provider } from '../agents/providers/types'
import { getCharacterById, setCharacterObituary } from '../db/repositories/characters'
import {
  OBITUARY_GENERATION_FAILED_MESSAGE,
  type GenerateObituaryResult
} from '../shared/campaignHub/obituary'

export type { GenerateObituaryResult } from '../shared/campaignHub/obituary'
export { OBITUARY_GENERATION_FAILED_MESSAGE } from '../shared/campaignHub/obituary'

export interface GenerateObituaryInput {
  campaignId: string
  characterId: string
  deathCause?: string
}

export async function generateObituaryForDeath(
  db: Database.Database,
  provider: Provider,
  input: GenerateObituaryInput
): Promise<GenerateObituaryResult> {
  const character = getCharacterById(db, input.characterId)
  if (!character) {
    return { ok: false, message: OBITUARY_GENERATION_FAILED_MESSAGE }
  }

  const deathCause = character.deathCause ?? input.deathCause ?? 'legendary_dying'

  try {
    const context = assembleObituaryContext(db, input.campaignId, input.characterId, deathCause)
    const obituary = enrichObituaryNpcNames(db, await generateObituary(provider, context))
    if (character.lifeStatus === 'dead') {
      setCharacterObituary(db, input.characterId, obituary)
    } else {
      persistObituaryOnDeath(db, {
        characterId: input.characterId,
        deathCause,
        obituary
      })
    }
    return { ok: true, obituary }
  } catch {
    return { ok: false, message: OBITUARY_GENERATION_FAILED_MESSAGE }
  }
}
