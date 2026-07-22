import type Database from 'better-sqlite3'
import { getCampaignById } from '../db/repositories/campaigns'
import { listDeitiesByCampaign } from '../db/repositories/deities'
import {
  getCharacterFactionReputation,
  getFactionById,
  listCharacterFactionReputations,
  listFactionRelationsByCampaign,
  listFactionsByCampaign
} from '../db/repositories/factions'
import type { Npc } from '../db/repositories/npcs'
import {
  buildCompactPantheonDigestLines,
  buildFactionDigestLines,
  buildFactionRelationDigestLines,
  buildFactionReputationDigestLines,
  parseFactionPressure,
  shouldEnrichFactionDigest,
  type FactionPressure
} from '../shared/factions'

const FAITH_PATTERN =
  /\b(?:pray|prayer|priest|priestess|temple|shrine|church|cult|deity|deities|god|gods|goddess|divine|divinity|faith|holy|sacred|pantheon|omen|blessing|clergy|acolyte|inquisitor)\b/i

const INTRIGUE_PATTERN =
  /\b(?:intrigue|court|faction|guild|politics|political|spy|spies|betray|betrayal|ally|allies|rival|rivals|reputation|coup|council|noble|ambassador|cabal|conspiracy)\b/i

export interface FactionPlayTags {
  intrigueTagged: boolean
  faithTagged: boolean
  intrigueOrFaithTagged: boolean
}

export interface DmFactionPlayContext {
  enriched: boolean
  includePantheon: boolean
  factionLines: string[]
  relationLines: string[]
  reputationLines: string[]
  pantheonLines: string[]
}

export function detectFactionPlayTags(playerInput: string): FactionPlayTags {
  const faithTagged = FAITH_PATTERN.test(playerInput)
  const intrigueTagged = INTRIGUE_PATTERN.test(playerInput)
  return {
    intrigueTagged,
    faithTagged,
    intrigueOrFaithTagged: intrigueTagged || faithTagged
  }
}

export function shouldIncludePantheonDigest(input: {
  pressure: FactionPressure
  intrigueOrFaithTagged: boolean
  faithOrDivineRelevant: boolean
}): boolean {
  if (input.pressure === 'heavy') {
    return true
  }
  const enriched = shouldEnrichFactionDigest({
    pressure: input.pressure,
    intrigueOrFaithTagged: input.intrigueOrFaithTagged
  })
  return enriched && input.faithOrDivineRelevant
}

function resolvePressure(db: Database.Database, campaignId: string): FactionPressure {
  const campaign = getCampaignById(db, campaignId)
  return parseFactionPressure(campaign?.factionPressure) ?? 'light'
}

function factionNamesById(
  factions: ReturnType<typeof listFactionsByCampaign>
): Record<string, string> {
  return Object.fromEntries(factions.map((faction) => [faction.id, faction.name]))
}

function deityNamesById(
  deities: ReturnType<typeof listDeitiesByCampaign>
): Record<string, string> {
  return Object.fromEntries(deities.map((deity) => [deity.id, deity.name]))
}

export function loadDmFactionPlayContext(
  db: Database.Database,
  input: { campaignId: string; characterId: string; playerInput: string }
): DmFactionPlayContext | null {
  const factions = listFactionsByCampaign(db, input.campaignId)
  if (factions.length === 0) {
    return null
  }
  const pressure = resolvePressure(db, input.campaignId)
  const tags = detectFactionPlayTags(input.playerInput)
  const enriched = shouldEnrichFactionDigest({
    pressure,
    intrigueOrFaithTagged: tags.intrigueOrFaithTagged
  })
  const includePantheon = shouldIncludePantheonDigest({
    pressure,
    intrigueOrFaithTagged: tags.intrigueOrFaithTagged,
    faithOrDivineRelevant: tags.faithTagged
  })
  const deities = listDeitiesByCampaign(db, input.campaignId)
  const names = factionNamesById(factions)
  const relations = listFactionRelationsByCampaign(db, input.campaignId)
  const reputations = listCharacterFactionReputations(db, input.characterId)
  return {
    enriched,
    includePantheon,
    factionLines: buildFactionDigestLines(factions, {
      enriched,
      deityNamesById: deityNamesById(deities)
    }),
    relationLines: buildFactionRelationDigestLines(relations, {
      enriched,
      factionNamesById: names
    }),
    reputationLines: buildFactionReputationDigestLines(reputations, {
      factionNamesById: names
    }),
    pantheonLines: includePantheon ? buildCompactPantheonDigestLines(deities) : []
  }
}

function appendNamedBlock(lines: string[], title: string, body: string[]): void {
  if (body.length === 0) {
    return
  }
  lines.push(`${title}: ${JSON.stringify(body)}`)
}

export function buildDmFactionPlayPromptSection(context: DmFactionPlayContext): string {
  const lines: string[] = []
  appendNamedBlock(lines, 'Faction digest', context.factionLines)
  appendNamedBlock(lines, 'Faction relations', context.relationLines)
  appendNamedBlock(lines, 'Acting PC faction reputation (non-neutral)', context.reputationLines)
  if (context.includePantheon) {
    appendNamedBlock(lines, 'Pantheon digest (compact — no tenets)', context.pantheonLines)
  }
  return lines.join('\n')
}

export function loadNpcFactionStandingLine(
  db: Database.Database,
  input: { npc: Npc; characterId: string }
): string | undefined {
  const factionId = input.npc.factionId
  if (!factionId) {
    return undefined
  }
  const faction = getFactionById(db, factionId)
  if (!faction) {
    return undefined
  }
  const row = getCharacterFactionReputation(db, input.characterId, factionId)
  const band = row?.band ?? 'neutral'
  const score = row?.score ?? 0
  const role = input.npc.factionMembershipRole
  const rolePart = role ? ` (your role: ${role})` : ''
  return `Active PC standing with your faction ${faction.name}${rolePart}: ${band} (${score})`
}
