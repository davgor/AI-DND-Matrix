import { sumUsageSnapshots } from '../../shared/llmUsage'
import type { ProviderUsageSnapshot } from '../../shared/llmUsage'
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

function contextWithUsageAggregation(
  context: GenerateContext | undefined,
  aggregate: (usage: ProviderUsageSnapshot) => void
): GenerateContext | undefined {
  if (!context) {
    return undefined
  }
  return {
    ...context,
    onUsage: aggregate
  }
}

function nextCap(currentCap: number): number {
  return Math.min(currentCap * 2, TOKEN_ESCALATION_CEILING)
}

function shouldStopTokenEscalation(error: unknown, escalation: number, cap: number): boolean {
  if (!isTruncationError(error)) {
    return true
  }
  if (escalation >= MAX_TOKEN_ESCALATIONS) {
    return true
  }
  return cap <= ESCALATION_MIN_CAP
}

export function withTokenEscalation(provider: Provider): Provider {
  return {
    async generate(prompt: string, context?: GenerateContext): Promise<string> {
      // Token escalation aggregates all attempts under one purpose: intercept
      // per-attempt onUsage from the inner provider, sum snapshots, and emit
      // a single metering callback after the successful final attempt.
      let cap = context?.maxTokens ?? DEFAULT_ESCALATION_BASE
      let attemptContext = context
      let aggregatedUsage: ProviderUsageSnapshot | null = null
      const recordUsage = (usage: ProviderUsageSnapshot): void => {
        aggregatedUsage = sumUsageSnapshots(aggregatedUsage, usage)
      }

      for (let escalation = 0; ; escalation += 1) {
        try {
          const innerContext = contextWithUsageAggregation(attemptContext, recordUsage)
          const result = await provider.generate(prompt, innerContext)
          if (context?.onUsage && aggregatedUsage) {
            context.onUsage(aggregatedUsage)
          }
          return result
        } catch (error) {
          if (shouldStopTokenEscalation(error, escalation, cap)) {
            throw error
          }
          cap = nextCap(cap)
          attemptContext = escalatedContext(context, cap)
        }
      }
    }
  }
}
