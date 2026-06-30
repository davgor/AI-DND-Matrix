import type { CharacterObituary } from './types'

export const OBITUARY_GENERATION_FAILED_MESSAGE = 'An obituary could not be written'

export type GenerateObituaryResult =
  | { ok: true; obituary: CharacterObituary }
  | { ok: false; message: string }
