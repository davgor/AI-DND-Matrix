import type {
  FactionKind,
  FactionPressure,
  FactionRelationStance
} from '../../shared/factions/types'
import { FACTION_PRESSURE_BANDS } from '../../shared/factions/types'

interface FactionsSkeletonSlot {
  key: string
  kind: FactionKind
  sortOrder: number
  needsDeityName: boolean
}

interface FactionsSkeletonRelation {
  factionAKey: string
  factionBKey: string
  stance: FactionRelationStance
}

interface FactionsSkeletonPlan {
  pressure: FactionPressure
  factions: FactionsSkeletonSlot[]
  relations: FactionsSkeletonRelation[]
}

const MEDIUM_WITH_DEITIES: FactionKind[] = [
  'civic',
  'mercantile',
  'religious',
  'criminal'
]
const MEDIUM_NO_DEITIES: FactionKind[] = ['civic', 'mercantile', 'military', 'criminal']
const LIGHT_KINDS: FactionKind[] = ['civic', 'mercantile', 'criminal']
const HEAVY_WITH_DEITIES: FactionKind[] = [
  'civic',
  'military',
  'mercantile',
  'religious',
  'clandestine',
  'political'
]
const HEAVY_NO_DEITIES: FactionKind[] = [
  'civic',
  'military',
  'mercantile',
  'criminal',
  'clandestine',
  'political'
]

/**
 * Create-pipeline pressure: engine-owned (no form field yet). Keyword bias, else medium.
 */
export function resolveCreateFactionPressure(premisePrompt: string): FactionPressure {
  const lower = premisePrompt.toLowerCase()
  if (/\b(court|intrigue|empire|conspiracy|politics|civil war)\b/.test(lower)) {
    return 'heavy'
  }
  if (/\b(pastoral|quiet village|peaceful hamlet|sleepy farm)\b/.test(lower)) {
    return 'light'
  }
  return 'medium'
}

function kindsForPlan(pressure: FactionPressure, deitiesPresent: boolean): FactionKind[] {
  if (pressure === 'light') {
    return LIGHT_KINDS
  }
  if (pressure === 'heavy') {
    return deitiesPresent ? HEAVY_WITH_DEITIES : HEAVY_NO_DEITIES
  }
  return deitiesPresent ? MEDIUM_WITH_DEITIES : MEDIUM_NO_DEITIES
}

function buildRelationPlan(
  factions: FactionsSkeletonSlot[],
  pressure: FactionPressure
): FactionsSkeletonRelation[] {
  const band = FACTION_PRESSURE_BANDS[pressure]
  const count = Math.max(band.minRelations, Math.min(2, band.maxRelations))
  if (factions.length < 2 || count === 0) {
    return []
  }
  const relations: FactionsSkeletonRelation[] = [
    {
      factionAKey: factions[0].key,
      factionBKey: factions[factions.length - 1].key,
      stance: 'rival'
    }
  ]
  if (count >= 2 && factions.length >= 3) {
    const faith = factions.find((slot) => slot.kind === 'religious') ?? factions[1]
    relations.push({
      factionAKey: faith.key,
      factionBKey: factions[0].key,
      stance: 'tense'
    })
  }
  return relations.slice(0, band.maxRelations)
}

export function buildFactionsSkeletonPlan(
  pressure: FactionPressure,
  deitiesPresent: boolean
): FactionsSkeletonPlan {
  const kinds = kindsForPlan(pressure, deitiesPresent)
  const factions: FactionsSkeletonSlot[] = kinds.map((kind, index) => ({
    key: `faction_${index}`,
    kind,
    sortOrder: index,
    needsDeityName: kind === 'religious'
  }))
  return {
    pressure,
    factions,
    relations: buildRelationPlan(factions, pressure)
  }
}

function factionSkeletonObject(slot: FactionsSkeletonSlot): Record<string, unknown> {
  const base: Record<string, unknown> = {
    key: slot.key,
    name: `{{FACTION_${slot.sortOrder}_NAME}}`,
    kind: slot.kind,
    summary: `{{FACTION_${slot.sortOrder}_SUMMARY}}`,
    sortOrder: slot.sortOrder
  }
  if (slot.needsDeityName) {
    base.deityName = `{{FACTION_${slot.sortOrder}_DEITY_NAME}}`
  }
  return base
}

/** Engine-authored JSON skeleton string with {{TOKEN}} placeholders. */
export function buildFactionsSkeletonJson(plan: FactionsSkeletonPlan): string {
  return JSON.stringify({
    factionPressure: plan.pressure,
    factionsSummary: '{{FACTIONS_SUMMARY}}',
    factions: plan.factions.map(factionSkeletonObject),
    relations: plan.relations.map((relation, index) => ({
      factionAKey: relation.factionAKey,
      factionBKey: relation.factionBKey,
      stance: relation.stance,
      summary: `{{RELATION_${index}_SUMMARY}}`
    }))
  })
}
