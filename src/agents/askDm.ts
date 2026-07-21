import { PROSE_CLARITY_RULES } from './campaignGeneration/prompts'
import type { GenerateContext, Provider } from './providers/types'
import type { AskDmContext } from './askDmContext'

// 040.1: 512 — one OOC facilitator reply; clarifications only, not a scene turn.
const ASK_DM_GENERATE_CONTEXT: GenerateContext = {
  systemPrompt: [
    'You are the dungeon master at the table, speaking out of character to the human player.',
    'The player is asking as themselves — not as their character — about rules, reminders, or table talk.',
    'Answer as a facilitator: clarify rules, recall established facts, and help the player orient.',
    'Do NOT narrate as if the character spoke, invent new scene events, advance combat, or resolve in-character actions.',
    'Do NOT treat this message as a player turn or fictional action.',
    PROSE_CLARITY_RULES
  ].join('\n'),
  maxTokens: 512,
  purpose: 'play.ooc_dm'
}

export function buildAskDmPrompt(context: AskDmContext): string {
  const lines = [
    `Campaign: ${context.campaignName}`,
    `Campaign summary: ${context.campaignSummary || '(none yet)'}`,
    `Active character: ${context.characterName} (${context.characterClass}, level ${context.characterLevel})`,
    'Recent in-character play lines (for reminders only — do not advance the scene):',
    context.recentIcLines.length > 0 ? context.recentIcLines.join('\n') : '(none yet)'
  ]

  if (context.oocTranscript.length > 0) {
    lines.push(
      'Out-of-character transcript so far:',
      context.oocTranscript.map((entry) => `${entry.role}: ${entry.content}`).join('\n')
    )
  }

  lines.push(`Player question (out of character): ${context.playerQuestion}`)
  lines.push('Reply in plain prose as the DM facilitator. Do not use JSON.')
  return lines.join('\n')
}

export async function generateAskDmReply(
  provider: Provider,
  context: AskDmContext
): Promise<string | null> {
  try {
    const raw = await provider.generate(buildAskDmPrompt(context), {
      ...ASK_DM_GENERATE_CONTEXT,
      campaignId: context.campaignId,
      characterId: context.characterId
    })
    const trimmed = raw.trim()
    return trimmed.length > 0 ? trimmed : null
  } catch {
    return null
  }
}
