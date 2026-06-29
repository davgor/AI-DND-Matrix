import type Database from 'better-sqlite3'
import type { Archetype } from '../../engine/hp'
import type { Bucket } from '../../shared/catalogTaxonomy'
import { listAllCreatures } from './creatures'
import { listAllSpells } from './spells'
import type { CatalogCreature, CatalogSpell } from './types'

export interface RetrievalResult<T> {
  entry: T
  score: number
}

export interface CreatureRetrievalQuery {
  buckets?: Bucket[]
  level?: number
  archetypeHint?: Archetype
  tags?: string[]
  limit?: number
}

export interface SpellRetrievalQuery {
  buckets?: Bucket[]
  archetypeHint?: Archetype
  tags?: string[]
  limit?: number
}

function bucketOverlapCount(entryBuckets: Bucket[], queryBuckets?: Bucket[]): number {
  if (!queryBuckets || queryBuckets.length === 0) return 0
  return entryBuckets.filter((bucket) => queryBuckets.includes(bucket)).length
}

function tagOverlapCount(entryTags: string[], queryTags?: string[]): number {
  if (!queryTags || queryTags.length === 0) return 0
  return entryTags.filter((tag) => queryTags.includes(tag)).length
}

function levelFitScore(levelMin: number, levelMax: number, targetLevel?: number): number {
  if (targetLevel === undefined) return 0
  if (targetLevel >= levelMin && targetLevel <= levelMax) return 2
  const distance = targetLevel < levelMin ? levelMin - targetLevel : targetLevel - levelMax
  return -0.5 * distance
}

function scoreCreature(creature: CatalogCreature, query: CreatureRetrievalQuery): number {
  let score = bucketOverlapCount(creature.buckets, query.buckets) * 3
  score += levelFitScore(creature.levelMin, creature.levelMax, query.level)
  if (query.archetypeHint && creature.archetypeHint === query.archetypeHint) score += 1
  score += tagOverlapCount(creature.tags, query.tags) * 0.5
  return score
}

function scoreSpell(spell: CatalogSpell, query: SpellRetrievalQuery): number {
  let score = bucketOverlapCount(spell.buckets, query.buckets) * 3
  if (query.archetypeHint && spell.archetypeHint === query.archetypeHint) score += 2
  score += tagOverlapCount(spell.tags, query.tags) * 0.5
  return score
}

function sortDeterministically<T extends { key: string }>(
  results: RetrievalResult<T>[]
): RetrievalResult<T>[] {
  return [...results].sort((a, b) => b.score - a.score || a.entry.key.localeCompare(b.entry.key))
}

function groupByPrimaryBucket<T extends { buckets: Bucket[] }>(
  results: RetrievalResult<T>[]
): Map<string, RetrievalResult<T>[]> {
  const groups = new Map<string, RetrievalResult<T>[]>()
  for (const result of results) {
    const groupKey = result.entry.buckets[0] ?? 'none'
    const group = groups.get(groupKey) ?? []
    group.push(result)
    groups.set(groupKey, group)
  }
  return groups
}

function roundRobinTake<T>(groups: Map<string, RetrievalResult<T>[]>, limit: number): RetrievalResult<T>[] {
  const diversified: RetrievalResult<T>[] = []
  let added = true
  while (diversified.length < limit && added) {
    added = false
    for (const group of groups.values()) {
      if (diversified.length >= limit) break
      const next = group.shift()
      if (next) {
        diversified.push(next)
        added = true
      }
    }
  }
  return diversified
}

function applyDiversity<T extends { buckets: Bucket[] }>(
  results: RetrievalResult<T>[],
  limit?: number
): RetrievalResult<T>[] {
  if (limit === undefined || results.length <= limit) return results.slice(0, limit)
  return roundRobinTake(groupByPrimaryBucket(results), limit)
}

export function retrieveCreatures(
  db: Database.Database,
  query: CreatureRetrievalQuery
): RetrievalResult<CatalogCreature>[] {
  const candidates = listAllCreatures(db).filter(
    (creature) => !query.buckets || bucketOverlapCount(creature.buckets, query.buckets) > 0
  )
  const scored = candidates.map((entry) => ({ entry, score: scoreCreature(entry, query) }))
  return applyDiversity(sortDeterministically(scored), query.limit)
}

export function retrieveSpells(
  db: Database.Database,
  query: SpellRetrievalQuery
): RetrievalResult<CatalogSpell>[] {
  const candidates = listAllSpells(db).filter((spell) => {
    const bucketOk = !query.buckets || bucketOverlapCount(spell.buckets, query.buckets) > 0
    const archetypeOk = !query.archetypeHint || spell.archetypeHint === query.archetypeHint
    return bucketOk && archetypeOk
  })
  const scored = candidates.map((entry) => ({ entry, score: scoreSpell(entry, query) }))
  return applyDiversity(sortDeterministically(scored), query.limit)
}
