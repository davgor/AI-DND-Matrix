import type { Ability, AbilityScores } from '../../engine/abilities'
import type { DamageType, ResistanceProfile } from '../../engine/damage'
import type { Archetype } from '../../engine/hp'
import type { Temperament } from '../../shared/alignment/types'
import type { Bucket } from '../../shared/catalogTaxonomy'

export type CatalogSource = 'seed' | 'generated' | 'generated-promoted'

export interface CatalogProvenance {
  generatedFrom?: string
  promotedAt?: string
  note?: string
}

export interface CatalogCreature {
  id: string
  key: string
  name: string
  archetypeHint?: Archetype
  levelMin: number
  levelMax: number
  hp: number
  ac: number
  abilities: AbilityScores
  resistances: ResistanceProfile
  damageTypes: DamageType[]
  tags: string[]
  buckets: Bucket[]
  temperament: Temperament
  canSpeak: boolean
  source: CatalogSource
  provenance?: CatalogProvenance
  version: number
  createdAt: string
}

export type CreateCatalogCreatureInput = Omit<CatalogCreature, 'id' | 'createdAt'>

export interface SpellConstraints {
  requiresArchetype?: Archetype[]
  requiresAbility?: Ability
  minLevel?: number
}

export interface CatalogSpell {
  id: string
  key: string
  name: string
  effectType: string
  range: string
  cost: number
  archetypeHint?: Archetype
  tags: string[]
  buckets: Bucket[]
  constraints: SpellConstraints
  source: CatalogSource
  provenance?: CatalogProvenance
  version: number
  createdAt: string
}

export type CreateCatalogSpellInput = Omit<CatalogSpell, 'id' | 'createdAt'>
