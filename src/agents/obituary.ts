import type Database from 'better-sqlite3'
import { getCampaignById } from '../db/repositories/campaigns'
import { getCharacterById, markCharacterDead } from '../db/repositories/characters'
import { listCharacterJournalEntries } from '../db/repositories/characterJournalEntries'
import { listLogEntriesByCharacterAndCategory } from '../db/repositories/logEntries'
import { listNpcMemoriesByNpc } from '../db/repositories/npcMemories'
import { getNpcById } from '../db/repositories/npcs'
import type { CharacterObituary, DeathCause } from '../shared/campaignHub/types'
import { takeRecent } from './contextWindow'
import { PROSE_CLARITY_RULES } from './campaignGeneration/prompts'
import { generateJsonWithRetry } from './jsonResponse'
import type { GenerateContext, Provider } from './providers/types'

export class ObituarySchemaError extends Error {}

// 040.1: 1024 — long-form narrativeBody plus per-NPC reactions, persisted
// verbatim as the character's permanent obituary. Cap reasoned from the schema
// (multi-paragraph memorial + a handful of reaction entries), not measured
// against recorded outputs; one-time cost, so generous on purpose.
const OBITUARY_GENERATE_CONTEXT: GenerateContext = { maxTokens: 1024 }

export interface ObituaryNpcHistory {
  npcId: string
  npcName: string
  role: string
  disposition: string
  backstory: string
  memories: Array<{ content: string; timestamp: string }>
  logBookEntries: Array<{ title: string; content: string }>
}

export interface ObituaryContext {
  deathCause: string
  characterName: string
  characterClass: string
  level: number
  identity: {
    who: string | null
    why: string | null
    where: string | null
    what: string | null
    openingScene: string | null
  }
  journalEntries: Array<{ content: string; inGameDate: number }>
  peopleLogEntries: Array<{ title: string; content: string; relatedEntityId: string | null }>
  currentStateSummary: string
  npcHistories: ObituaryNpcHistory[]
}

function buildNpcHistories(
  db: Database.Database,
  peopleEntries: ReturnType<typeof listLogEntriesByCharacterAndCategory>
): ObituaryNpcHistory[] {
  const byNpc = new Map<string, ObituaryNpcHistory>()
  for (const entry of peopleEntries) {
    if (!entry.relatedEntityId) {
      continue
    }
    const npc = getNpcById(db, entry.relatedEntityId)
    if (!npc) {
      continue
    }
    const existing = byNpc.get(npc.id)
    const logSlice = { title: entry.title, content: entry.content }
    if (existing) {
      existing.logBookEntries.push(logSlice)
      continue
    }
    const memories = takeRecent(listNpcMemoriesByNpc(db, npc.id)).map((memory) => ({
      content: memory.content,
      timestamp: memory.timestamp
    }))
    byNpc.set(npc.id, {
      npcId: npc.id,
      npcName: npc.name,
      role: npc.role,
      disposition: npc.disposition,
      backstory: npc.backstory,
      memories,
      logBookEntries: [logSlice]
    })
  }
  return [...byNpc.values()]
}

export function assembleObituaryContext(
  db: Database.Database,
  campaignId: string,
  characterId: string,
  deathCause: DeathCause | string
): ObituaryContext {
  const character = getCharacterById(db, characterId)
  if (!character) {
    throw new Error(`Character ${characterId} not found`)
  }
  const campaign = getCampaignById(db, campaignId)
  const journalEntries = listCharacterJournalEntries(db, characterId).map((entry) => ({
    content: entry.content,
    inGameDate: entry.inGameDate
  }))
  const peopleLogEntries = listLogEntriesByCharacterAndCategory(db, characterId, 'person')
  return {
    deathCause,
    characterName: character.name,
    characterClass: character.characterClass,
    level: character.level,
    identity: {
      who: character.identityWho,
      why: character.identityWhy,
      where: character.identityWhere,
      what: character.identityWhat,
      openingScene: character.openingScene
    },
    journalEntries,
    peopleLogEntries: peopleLogEntries.map((entry) => ({
      title: entry.title,
      content: entry.content,
      relatedEntityId: entry.relatedEntityId
    })),
    currentStateSummary: campaign?.currentStateSummary ?? '',
    npcHistories: buildNpcHistories(db, peopleLogEntries)
  }
}

function isObituaryTone(value: unknown): value is 'positive' | 'negative' | 'neutral' {
  return value === 'positive' || value === 'negative' || value === 'neutral'
}

function parseNpcReactions(rawReactions: unknown): CharacterObituary['npcReactions'] | undefined {
  if (!Array.isArray(rawReactions)) {
    return undefined
  }
  const npcReactions: CharacterObituary['npcReactions'] = []
  for (const item of rawReactions) {
    if (typeof item !== 'object' || item === null) {
      return undefined
    }
    const reaction = item as Record<string, unknown>
    if (
      typeof reaction['npcId'] !== 'string' ||
      !isObituaryTone(reaction['tone']) ||
      typeof reaction['reaction'] !== 'string'
    ) {
      return undefined
    }
    npcReactions.push({
      npcId: reaction['npcId'],
      npcName: reaction['npcId'],
      tone: reaction['tone'],
      reaction: reaction['reaction']
    })
  }
  return npcReactions
}

function parseGeneratedObituary(value: unknown): Omit<CharacterObituary, 'generatedAt'> | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }
  const candidate = value as Record<string, unknown>
  if (typeof candidate['deathCause'] !== 'string' || typeof candidate['narrativeBody'] !== 'string') {
    return undefined
  }
  const npcReactions = parseNpcReactions(candidate['npcReactions'])
  if (!npcReactions) {
    return undefined
  }
  return {
    deathCause: candidate['deathCause'],
    narrativeBody: candidate['narrativeBody'],
    npcReactions
  }
}

function buildObituaryPrompt(context: ObituaryContext): string {
  return [
    'Write a grounded in-world obituary for a fallen player character.',
    PROSE_CLARITY_RULES,
    'Ground ONLY on the SQLite-backed context below — not chat transcripts.',
    `Death cause code: ${context.deathCause}`,
    `Character: ${JSON.stringify({
      name: context.characterName,
      class: context.characterClass,
      level: context.level,
      identity: context.identity
    })}`,
    `Journal entries: ${JSON.stringify(context.journalEntries)}`,
    `Log-book People entries: ${JSON.stringify(context.peopleLogEntries)}`,
    `Campaign current state summary: ${context.currentStateSummary}`,
    `NPC histories (log-book People + npc_memories): ${JSON.stringify(context.npcHistories)}`,
    'Include npcReactions only for NPCs with meaningful history in the context.',
    'Respond ONLY with JSON:',
    '{"deathCause":string,"narrativeBody":string,"npcReactions":[{"npcId":string,"tone":"positive"|"negative"|"neutral","reaction":string}]}'
  ].join('\n')
}

export async function generateObituary(
  provider: Provider,
  context: ObituaryContext
): Promise<CharacterObituary> {
  const parsed = await generateJsonWithRetry(
    provider,
    () => buildObituaryPrompt(context),
    (value) => parseGeneratedObituary(value) ?? undefined,
    {
      context: OBITUARY_GENERATE_CONTEXT,
      exhaustedError: () =>
        new ObituarySchemaError('Obituary agent did not return a valid schema after retries')
    }
  )
  return {
    generatedAt: new Date().toISOString(),
    ...parsed
  }
}

export function enrichObituaryNpcNames(
  db: Database.Database,
  obituary: CharacterObituary
): CharacterObituary {
  return {
    ...obituary,
    npcReactions: obituary.npcReactions.map((reaction) => ({
      ...reaction,
      npcName: getNpcById(db, reaction.npcId)?.name ?? reaction.npcName
    }))
  }
}

export interface PersistObituaryOnDeathInput {
  characterId: string
  deathCause: DeathCause | string
  obituary: CharacterObituary
}

export function persistObituaryOnDeath(db: Database.Database, input: PersistObituaryOnDeathInput): void {
  const persist = db.transaction(() => {
    markCharacterDead(db, {
      characterId: input.characterId,
      deathCause: input.deathCause,
      obituary: input.obituary
    })
  })
  persist()
}
