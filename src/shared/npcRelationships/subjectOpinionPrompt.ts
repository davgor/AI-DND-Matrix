import type { OpinionStance, OpinionSubject } from '../npcRelationships/types'
import { parseOpinionStance } from '../npcRelationships/types'

export interface SubjectOpinionPromptInput {
  holderName: string
  holderRole: string
  temperament: string
  alignment: string | null
  disposition: string
  canSpeak: boolean
  subjectLabel: string
  subjectType: OpinionSubject['subjectType']
  memoriesJson?: string
  dialogueJson?: string
  actionBeatsJson?: string
}

/** Build a multi-subject opinion prompt (holder-scoped grounding only). */
export function buildSubjectOpinionPrompt(input: SubjectOpinionPromptInput): string {
  const alignmentLine = input.alignment
    ? `Alignment: ${input.alignment}`
    : 'Alignment: unknown'
  const subjectKind =
    input.subjectType === 'player_character' ? 'player character' : 'NPC'
  const lines = [
    `NPC (opinion holder): ${input.holderName} (${input.holderRole})`,
    `Disposition string: "${input.disposition}"`,
    `Temperament: ${input.temperament}`,
    alignmentLine,
    `Subject (${subjectKind}): ${input.subjectLabel}`,
    'Write how the holder feels about the subject based only on the grounding below.',
    'Reply as JSON only: {"summary":"...","stance":"warm"|"wary"|"hostile"|"unknown"}',
    'summary is one short DM paragraph (2-4 sentences). Do not invent events.'
  ]

  if (input.canSpeak) {
    lines.push(`Private memories (holder only): ${input.memoriesJson ?? '[]'}`)
    if (input.dialogueJson) {
      lines.push(`Recent dialogue snippets: ${input.dialogueJson}`)
    }
  } else {
    lines.push('Holder cannot speak — infer from observed actions only.')
    lines.push(`Observed actions: ${input.actionBeatsJson ?? '[]'}`)
  }
  return lines.join('\n')
}

export function parseSubjectOpinionResponse(raw: string): {
  summary: string
  stance: OpinionStance
} | null {
  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>
    if (typeof parsed['summary'] !== 'string' || parsed['summary'].trim().length === 0) {
      return null
    }
    return {
      summary: parsed['summary'].trim(),
      stance: parseOpinionStance(parsed['stance'])
    }
  } catch {
    return { summary: trimmed, stance: 'unknown' }
  }
}
