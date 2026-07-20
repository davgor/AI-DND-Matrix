import type { FleeAttemptResult } from '../engine/fleeDisengage'
import { generateJsonWithRetry } from './jsonResponse'
import type { GenerateContext, Provider } from './providers/types'
import {
  parseDmEscapeJudgment,
  validateDmEscapeJudgment,
  type DmEscapeJudgment
} from '../shared/combat/flee/types'

export class FleeNarrationSchemaError extends Error {}

// 040.1: 192 — an outcome word plus one short narration line.
const FLEE_NARRATION_GENERATE_CONTEXT: GenerateContext = { maxTokens: 192, purpose: 'play.combat' }

export interface FleeNarrationContext {
  checkResult: FleeAttemptResult
  regionDescription: string
  hostileSummary: string
  repeatAttempt: boolean
}

function buildFleeNarrationPrompt(context: FleeNarrationContext): string {
  return [
    'The player won an engine-resolved disengage check. Judge whether they fully escaped or are still pursued.',
    `Region: ${context.regionDescription}`,
    `Hostiles present: ${context.hostileSummary}`,
    `Player roll ${context.checkResult.playerTotal} vs hostile ${context.checkResult.hostileTotal} (margin ${context.checkResult.margin}).`,
    context.repeatAttempt ? 'This is a repeat flee attempt this encounter.' : 'First flee attempt this encounter.',
    'Respond ONLY with JSON: {"outcome":"still_pursued"|"escaped","narrationText":"..."}',
    'Choose still_pursued when hostiles could still catch up; escaped only when the player has clearly broken contact.'
  ].join('\n')
}

export async function judgeEscapeNarration(
  provider: Provider,
  context: FleeNarrationContext
): Promise<DmEscapeJudgment> {
  if (!context.checkResult.success) {
    throw new FleeNarrationSchemaError('Escape narration requires a successful disengage check')
  }
  const prompt = buildFleeNarrationPrompt(context)
  return generateJsonWithRetry(
    provider,
    prompt,
    (parsed) => {
      const judgment = parseDmEscapeJudgment(parsed)
      if (!judgment) {
        return undefined
      }
      return validateDmEscapeJudgment(judgment, context.checkResult.success)
    },
    {
      context: FLEE_NARRATION_GENERATE_CONTEXT,
      exhaustedError: () => new FleeNarrationSchemaError('Escape narration parse failed')
    }
  )
}

export { validateDmEscapeJudgment }
