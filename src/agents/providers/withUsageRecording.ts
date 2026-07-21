import type Database from 'better-sqlite3'
import {
  resolvePurpose,
  warnIfUnclassifiedPurpose,
  type ProviderUsageSnapshot
} from '../../shared/llmUsage'
import { tryInsertLlmUsageEvent } from '../../db/repositories/llmUsageEvents'
import type { GenerateContext, Provider } from './types'

export interface UsageRecordingDeps {
  getDb: () => Database.Database
  providerName: string
  defaultModelId: string
  warn?: (message: string) => void
  logInsertError?: (message: string, error: unknown) => void
}

/**
 * Records successful generate usage into SQLite (best-effort).
 * Wrap outside withTokenEscalation so escalated attempts aggregate into one event.
 */
export function withUsageRecording(provider: Provider, deps: UsageRecordingDeps): Provider {
  return {
    async generate(prompt: string, context?: GenerateContext): Promise<string> {
      const purpose = warnIfUnclassifiedPurpose(context?.purpose, deps.warn)
      let snapshot: ProviderUsageSnapshot | null = null

      const meteringContext: GenerateContext = {
        ...context,
        purpose,
        onUsage: (usage) => {
          snapshot = usage
          context?.onUsage?.(usage)
        }
      }

      const text = await provider.generate(prompt, meteringContext)
      persistSuccess(deps, purpose, context, snapshot)
      return text
    }
  }
}

function persistSuccess(
  deps: UsageRecordingDeps,
  purpose: ReturnType<typeof resolvePurpose>,
  context: GenerateContext | undefined,
  snapshot: ProviderUsageSnapshot | null
): void {
  if (!snapshot) {
    return
  }
  try {
    tryInsertLlmUsageEvent(
      deps.getDb(),
      {
        providerName: deps.providerName,
        modelId: snapshot.modelId ?? deps.defaultModelId,
        inputTokens: snapshot.inputTokens,
        outputTokens: snapshot.outputTokens,
        totalTokens: snapshot.totalTokens,
        purpose,
        campaignId: context?.campaignId ?? null,
        characterId: context?.characterId ?? null,
        outcome: 'success'
      },
      deps.logInsertError
    )
  } catch (error) {
    deps.logInsertError?.('[llmUsageEvents] failed to persist usage event', error)
  }
}
