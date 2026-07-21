import { PROSE_CLARITY_RULES } from './campaignGeneration/prompts'
import type { GenerateContext, Provider } from './providers/types'
import type { NpcOpinionContext } from './npcOpinionContext'

// 040.1: 224 — one DM-voiced paragraph on how the NPC feels about the player.
const NPC_OPINION_GENERATE_CONTEXT: GenerateContext = {
  systemPrompt: [
    'You are the dungeon master writing a short internal summary for the player.',
    'Write one paragraph (2-4 sentences) in second person about the player ("you"), describing how this NPC currently feels about them.',
    'Ground only on the facts provided — do not invent backstory or events.',
    PROSE_CLARITY_RULES
  ].join('\n'),
  maxTokens: 224,
  purpose: 'play.npc_reaction'
}

export function buildNpcOpinionPrompt(context: NpcOpinionContext): string {
  const alignmentLine = context.alignment ? `Alignment: ${context.alignment}` : 'Alignment: unknown'
  const lines = [
    `NPC: ${context.npcName} (${context.role})`,
    `Disposition toward the player: "${context.disposition}"`,
    `Temperament: ${context.temperament}`,
    alignmentLine,
    'Summarize how this NPC feels about the player based only on the grounding below.'
  ]

  if (context.canSpeak) {
    lines.push(`Private memories (this NPC only): ${JSON.stringify(context.memories ?? [])}`)
    if (context.dialogueSnippets && context.dialogueSnippets.length > 0) {
      lines.push(`Recent dialogue involving this NPC and the player: ${JSON.stringify(context.dialogueSnippets)}`)
    }
    return lines.join('\n')
  }

  lines.push('This NPC cannot speak — infer attitude from observed actions only, not dialogue or private speech memories.')
  lines.push(`Observed actions involving this NPC: ${JSON.stringify(context.actionBeats ?? [])}`)
  return lines.join('\n')
}

export async function generateNpcOpinionSummary(
  provider: Provider,
  context: NpcOpinionContext
): Promise<string | null> {
  try {
    const raw = await provider.generate(buildNpcOpinionPrompt(context), {
      ...NPC_OPINION_GENERATE_CONTEXT,
      campaignId: context.campaignId,
      characterId: context.characterId
    })
    const trimmed = raw.trim()
    return trimmed.length > 0 ? trimmed : null
  } catch {
    return null
  }
}
