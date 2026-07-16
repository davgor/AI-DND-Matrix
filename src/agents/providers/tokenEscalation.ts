import type { GenerateContext, Provider } from './types'

/**
 * 040.14: adaptive output ceilings. The 040.1 truncation guard makes adapters
 * throw when a response hits its maxTokens cap — correct for preventing
 * persisted garbage, but retrying the identical cap fails deterministically.
 * This decorator retries a truncated call with a doubled cap (bounded below),
 * so legitimately large outputs (a side-effect-heavy narration, a long NPC
 * speech) recover automatically while the tuned caps keep the common case cheap.
 */

/** Adapter default when a call carries no explicit cap (see claude.ts DEFAULT_MAX_TOKENS). */
export const DEFAULT_ESCALATION_BASE = 1024

/** Caps at or below this are intentional micro-caps (connectivity pings) — never escalate. */
export const ESCALATION_MIN_CAP = 8

/** Escalated retries per call: base → ×2 → ×4, then the truncation error propagates. */
export const MAX_TOKEN_ESCALATIONS = 2

/** Absolute ceiling — matches the largest hand-tuned band (flaggedNpc details / bulk generation). */
export const TOKEN_ESCALATION_CEILING = 8192

/**
 * Shared machine-readable marker set by ClaudeTruncationError and
 * Player2TruncationError so callers can detect truncation without importing
 * adapter-specific classes.
 */
interface ProviderTruncationMarker {
  readonly isProviderTruncation: true
}

export function isTruncationError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }
  return (error as Partial<ProviderTruncationMarker>).isProviderTruncation === true
}

function escalatedContext(context: GenerateContext | undefined, cap: number): GenerateContext {
  return { ...context, maxTokens: cap }
}

function nextCap(currentCap: number): number {
  return Math.min(currentCap * 2, TOKEN_ESCALATION_CEILING)
}

export function withTokenEscalation(provider: Provider): Provider {
  return {
    async generate(prompt: string, context?: GenerateContext): Promise<string> {
      let cap = context?.maxTokens ?? DEFAULT_ESCALATION_BASE
      let attemptContext = context

      for (let escalation = 0; ; escalation += 1) {
        try {
          return await provider.generate(prompt, attemptContext)
        } catch (error) {
          const exhausted = escalation >= MAX_TOKEN_ESCALATIONS
          if (!isTruncationError(error) || exhausted || cap <= ESCALATION_MIN_CAP) {
            throw error
          }
          cap = nextCap(cap)
          attemptContext = escalatedContext(context, cap)
        }
      }
    }
  }
}
