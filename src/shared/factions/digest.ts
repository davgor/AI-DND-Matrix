import {
  FACTION_DIGEST_ENRICHED_MAX_LINES,
  FACTION_DIGEST_LINE_MAX_CHARS,
  FACTION_DIGEST_SLIM_MAX_LINES,
  FACTION_RELATION_DIGEST_ENRICHED_MAX,
  FACTION_RELATION_DIGEST_SLIM_MAX,
  FACTION_REPUTATION_DIGEST_MAX,
  type CharacterFactionReputation,
  type Faction,
  type FactionRelation
} from './types'

function truncateLine(text: string): string {
  if (text.length <= FACTION_DIGEST_LINE_MAX_CHARS) return text
  return `${text.slice(0, FACTION_DIGEST_LINE_MAX_CHARS - 1)}…`
}

function sortByOrder(a: Faction, b: Faction): number {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
}

export function buildFactionDigestLines(
  factions: Faction[],
  options: { enriched: boolean; deityNamesById: Record<string, string> }
): string[] {
  const max = options.enriched ? FACTION_DIGEST_ENRICHED_MAX_LINES : FACTION_DIGEST_SLIM_MAX_LINES
  return [...factions]
    .sort(sortByOrder)
    .slice(0, max)
    .map((faction) => formatFactionLine(faction, options))
}

function formatFactionLine(
  faction: Faction,
  options: { enriched: boolean; deityNamesById: Record<string, string> }
): string {
  const parts = [`${faction.name} [${faction.kind}]`]
  if (faction.deityId) {
    const deityName = options.deityNamesById[faction.deityId]
    if (deityName) parts.push(`deity:${deityName}`)
  }
  if (options.enriched && faction.summary) {
    parts.push(faction.summary)
  }
  return truncateLine(parts.join(' — '))
}

export function buildFactionRelationDigestLines(
  relations: FactionRelation[],
  options: { enriched: boolean; factionNamesById: Record<string, string> }
): string[] {
  const max = options.enriched
    ? FACTION_RELATION_DIGEST_ENRICHED_MAX
    : FACTION_RELATION_DIGEST_SLIM_MAX
  return relations.slice(0, max).map((relation) => {
    const a = options.factionNamesById[relation.factionAId] ?? relation.factionAId
    const b = options.factionNamesById[relation.factionBId] ?? relation.factionBId
    const base = `${a} ↔ ${b}: ${relation.stance}`
    if (options.enriched && relation.summary) {
      return truncateLine(`${base} — ${relation.summary}`)
    }
    return truncateLine(base)
  })
}

export function buildFactionReputationDigestLines(
  rows: CharacterFactionReputation[],
  options: { factionNamesById: Record<string, string> }
): string[] {
  return rows
    .filter((row) => row.band !== 'neutral')
    .slice(0, FACTION_REPUTATION_DIGEST_MAX)
    .map((row) => {
      const name = options.factionNamesById[row.factionId] ?? row.factionId
      return truncateLine(`${name}: ${row.band} (${row.score})`)
    })
}

/** Compact pantheon line shape (name / epithet / domains / forgotten) — no tenets/blurbs. */
export interface PantheonDigestDeity {
  name: string
  epithet: string
  domains: string[]
  isForgotten: boolean
}

export function buildCompactPantheonDigestLines(deities: PantheonDigestDeity[]): string[] {
  return deities.map((deity) => {
    const epithet = deity.epithet ? `, ${deity.epithet}` : ''
    const domains = deity.domains.join(', ')
    const forgotten = deity.isForgotten ? ' (forgotten)' : ''
    return truncateLine(`${deity.name}${epithet} — ${domains}${forgotten}`)
  })
}
