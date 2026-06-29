import type Database from 'better-sqlite3'
import { importCreatureSeeds, importSpellSeeds } from '../importPipeline'
import { CREATURE_SEEDS_V1 } from './creatures'
import { SPELL_SEEDS_V1 } from './spells'

export function seedCreatureAndSpellCatalogV1(db: Database.Database): void {
  importCreatureSeeds(db, CREATURE_SEEDS_V1)
  importSpellSeeds(db, SPELL_SEEDS_V1)
}
