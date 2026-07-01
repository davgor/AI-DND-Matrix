import { tryParseJson } from './jsonResponse'
import type { Provider } from './providers/types'
import { MAX_SCHEMA_ATTEMPTS } from './dm'
import type { CharacterGuidedCreationFields } from '../shared/guidedCreation/types'

export interface OpeningSceneKickoffResponse {
  dmReply: string
}

export interface OpeningSceneContext {
  campaignPremise: string
  identity: Pick<
    CharacterGuidedCreationFields,
    'identityWho' | 'identityWhy' | 'identityWhere' | 'identityWhat'
  >
  regions: Array<{ name: string; description: string }>
  npcs: Array<{ name: string; role: string; disposition: string }>
  storyThread: { title: string; state: string; summary: string } | null
  transcript: Array<{ role: 'player' | 'dm'; content: string }>
  currentOpeningScene: string | null
}

export interface OpeningSceneResponse {
  dmReply: string
  proposedOpeningScene: string | null
  sceneReady: boolean
}

function isOpeningSceneResponse(value: unknown): value is OpeningSceneResponse {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate['dmReply'] === 'string' &&
    typeof candidate['sceneReady'] === 'boolean' &&
    (candidate['proposedOpeningScene'] === null || typeof candidate['proposedOpeningScene'] === 'string')
  )
}

function isOpeningSceneKickoffResponse(value: unknown): value is OpeningSceneKickoffResponse {
  return typeof value === 'object' && value !== null && typeof (value as Record<string, unknown>)['dmReply'] === 'string'
}

function buildOpeningSceneKickoffPrompt(
  context: Omit<OpeningSceneContext, 'transcript' | 'currentOpeningScene'>
): string {
  return [
    'You are the DM beginning the opening-scene negotiation before play. The player has not spoken yet.',
    'Open with a warm, in-character prompt that invites them to describe how the story should begin.',
    'Reference their locked identity and one concrete detail from the campaign seed when helpful.',
    'Do not finalize the scene yet — invite collaboration.',
    `Campaign premise: ${context.campaignPremise}`,
    `Locked identity: ${JSON.stringify(context.identity)}`,
    `Regions: ${JSON.stringify(context.regions)}`,
    `NPCs: ${JSON.stringify(context.npcs)}`,
    `Story thread: ${JSON.stringify(context.storyThread)}`,
    'Respond ONLY with JSON: {"dmReply":string}'
  ].join('\n')
}

export function openingSceneKickoffFallback(): string {
  return 'We have who you are — now let us choose where the story begins. Describe the opening you imagine: where you are, what is happening, and what pulls you into the first scene.'
}

export async function runOpeningSceneKickoff(
  provider: Provider,
  context: Omit<OpeningSceneContext, 'transcript' | 'currentOpeningScene'>
): Promise<OpeningSceneKickoffResponse> {
  for (let attempt = 1; attempt <= MAX_SCHEMA_ATTEMPTS; attempt += 1) {
    const raw = await provider.generate(buildOpeningSceneKickoffPrompt(context))
    const parsed = tryParseJson(raw)
    if (isOpeningSceneKickoffResponse(parsed)) {
      return parsed
    }
  }
  throw new Error('Opening scene kickoff did not return a valid schema after retries')
}

function buildOpeningScenePrompt(context: OpeningSceneContext, playerMessage: string): string {
  return [
    'You are the DM helping the player negotiate the opening scene before play begins.',
    'Ground yourself in persisted identity and campaign seed data. Do not resolve checks, grant items, or mutate world state.',
    `Campaign premise: ${context.campaignPremise}`,
    `Locked identity: ${JSON.stringify(context.identity)}`,
    `Regions: ${JSON.stringify(context.regions)}`,
    `NPCs: ${JSON.stringify(context.npcs)}`,
    `Story thread: ${JSON.stringify(context.storyThread)}`,
    `Current proposed opening scene: ${JSON.stringify(context.currentOpeningScene)}`,
    `Transcript so far: ${JSON.stringify(context.transcript)}`,
    `Latest player message: ${playerMessage}`,
    'Respond ONLY with JSON: {"dmReply":string,"proposedOpeningScene":string|null,"sceneReady":bool}',
    'Set sceneReady true only when the player and DM have converged on a starting scene.'
  ].join('\n')
}

export async function runOpeningSceneTurn(
  provider: Provider,
  context: OpeningSceneContext,
  playerMessage: string
): Promise<OpeningSceneResponse> {
  for (let attempt = 1; attempt <= MAX_SCHEMA_ATTEMPTS; attempt += 1) {
    const raw = await provider.generate(buildOpeningScenePrompt(context, playerMessage))
    const parsed = tryParseJson(raw)
    if (isOpeningSceneResponse(parsed)) {
      return parsed
    }
  }
  throw new Error('Opening scene agent did not return a valid schema after retries')
}
