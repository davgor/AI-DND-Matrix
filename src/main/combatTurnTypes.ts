import type Database from 'better-sqlite3'
import type { RandomFn } from '../engine/abilities'
import type { Character } from '../db/repositories/characters'
import type { Provider } from '../agents/providers/types'
import type { IntentInterpretation } from '../agents/dm'

export interface CombatTurnInput {
  db: Database.Database
  provider: Provider
  campaignId: string
  character: Character
  regionId: string
  intent: IntentInterpretation
  playerInput: string
  rng: RandomFn
}
