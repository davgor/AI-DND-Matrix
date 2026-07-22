import type Database from 'better-sqlite3'
import type { TurnResult } from '../main/turnIpc'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { resolvePlayerTurn } from '../main/turnIpc'

export function fleeIntentJson(): string {
  return JSON.stringify({ intent: { checkNeeded: false, combatIntent: 'flee' } })
}

export function npcReactionJson(): string {
  return JSON.stringify({ actionDescription: '**The goblin snarls.**', attack: false })
}

export function exploreTurnResponses(): string[] {
  return [
    JSON.stringify({
      intent: { checkNeeded: false },
      routingPlan: { disposition: 'narrate', beats: [{ kind: 'dmNarration' }] }
    }),
    JSON.stringify({ narrationText: 'You catch your breath in the hallway.' })
  ]
}

export function scriptedRng(values: number[]): () => number {
  let index = 0
  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0.5
    index += 1
    return value
  }
}

export function fleeSmokeProvider() {
  return createScriptedProvider([
    fleeIntentJson(),
    npcReactionJson(),
    fleeIntentJson(),
    JSON.stringify({ outcome: 'still_pursued', narrationText: 'You are not safe yet.' }),
    fleeIntentJson(),
    JSON.stringify({ outcome: 'escaped', narrationText: 'You slip through the door.' }),
    npcReactionJson(),
    ...exploreTurnResponses()
  ])
}

export async function resolveFleeTurn(input: {
  db: Database.Database
  campaignId: string
  playerId: string
  playerInput: string
  provider: ReturnType<typeof createScriptedProvider>
  rng: () => number
}): Promise<TurnResult> {
  return resolvePlayerTurn(
    input.db, 
    input.provider, 
    { campaignId: input.campaignId, characterId: input.playerId, playerInput: input.playerInput }, { rng: input.rng })
}
