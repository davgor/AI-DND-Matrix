import { tryParseJson } from './jsonResponse'
import type { Provider } from './providers/types'
import { MAX_SCHEMA_ATTEMPTS } from './dm'
import type { IdentityFoundationsStatus } from '../shared/guidedCreation/types'
import { IDENTITY_FOUNDATIONS } from '../shared/guidedCreation/types'

export { MAX_SCHEMA_ATTEMPTS as MAX_IDENTITY_ATTEMPTS }

export interface IdentityInterviewResponse {
  dmReply: string
  foundations: IdentityFoundationsStatus
  allFoundationsComplete: boolean
}

export interface IdentityInterviewContext {
  campaignPremise: string
  characterName: string
  characterClass: string
  abilityScores: Record<string, number>
  alignment: string | null
  transcript: Array<{ role: 'player' | 'dm'; content: string }>
  currentFoundations: IdentityFoundationsStatus
}

function emptyFoundations(): IdentityFoundationsStatus {
  return Object.fromEntries(
    IDENTITY_FOUNDATIONS.map((key) => [key, { complete: false }])
  ) as IdentityFoundationsStatus
}

function isFoundationStatus(value: unknown): value is { complete: boolean; summary?: string } {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate['complete'] === 'boolean' &&
    (candidate['summary'] === undefined || typeof candidate['summary'] === 'string')
  )
}

function isIdentityInterviewResponse(value: unknown): value is IdentityInterviewResponse {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  if (typeof candidate['dmReply'] !== 'string' || typeof candidate['allFoundationsComplete'] !== 'boolean') {
    return false
  }
  const foundations = candidate['foundations']
  if (typeof foundations !== 'object' || foundations === null) {
    return false
  }
  return IDENTITY_FOUNDATIONS.every((key) => isFoundationStatus((foundations as Record<string, unknown>)[key]))
}

function buildIdentityInterviewPrompt(context: IdentityInterviewContext, playerMessage: string): string {
  return [
    'You are the DM conducting a pre-play identity interview. Interview for Who / Why / Where / What.',
    'Ask follow-up questions freely. Do not invent mechanical stats, checks, loot, or world mutations.',
    `Campaign premise: ${context.campaignPremise}`,
    `Mechanical character: ${JSON.stringify({
      name: context.characterName,
      class: context.characterClass,
      abilityScores: context.abilityScores,
      alignment: context.alignment
    })}`,
    'The player chose alignment at character setup — reference it for roleplay but never change or overwrite it.',
    `Current foundation status: ${JSON.stringify(context.currentFoundations)}`,
    `Transcript so far: ${JSON.stringify(context.transcript)}`,
    `Latest player message: ${playerMessage}`,
    'Respond ONLY with JSON: {"dmReply":string,"foundations":{"who":{"complete":bool,"summary"?:string},"why":{"complete":bool,"summary"?:string},"where":{"complete":bool,"summary"?:string},"what":{"complete":bool,"summary"?:string}},"allFoundationsComplete":bool}',
    'Set complete true and include summary only when a foundation is ready to lock in.'
  ].join('\n')
}

export async function runIdentityInterviewTurn(
  provider: Provider,
  context: IdentityInterviewContext,
  playerMessage: string
): Promise<IdentityInterviewResponse> {
  for (let attempt = 1; attempt <= MAX_SCHEMA_ATTEMPTS; attempt += 1) {
    const raw = await provider.generate(buildIdentityInterviewPrompt(context, playerMessage))
    const parsed = tryParseJson(raw)
    if (isIdentityInterviewResponse(parsed)) {
      return parsed
    }
  }
  throw new Error('Identity interview agent did not return a valid schema after retries')
}

export function mergeFoundationStatus(
  current: IdentityFoundationsStatus,
  incoming: IdentityFoundationsStatus
): IdentityFoundationsStatus {
  const merged = { ...current }
  for (const key of IDENTITY_FOUNDATIONS) {
    const next = incoming[key]
    if (next.complete && next.summary) {
      merged[key] = { complete: true, summary: next.summary }
    }
  }
  return merged
}

export function allFoundationsComplete(status: IdentityFoundationsStatus): boolean {
  return IDENTITY_FOUNDATIONS.every((key) => status[key].complete && Boolean(status[key].summary))
}

export function summariesFromStatus(status: IdentityFoundationsStatus): Partial<Record<(typeof IDENTITY_FOUNDATIONS)[number], string>> {
  const summaries: Partial<Record<(typeof IDENTITY_FOUNDATIONS)[number], string>> = {}
  for (const key of IDENTITY_FOUNDATIONS) {
    if (status[key].summary) {
      summaries[key] = status[key].summary
    }
  }
  return summaries
}

export function defaultIdentityFoundations(): IdentityFoundationsStatus {
  return emptyFoundations()
}
