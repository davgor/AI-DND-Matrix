export interface GenerateContext {
  systemPrompt?: string
  /**
   * 040.1: every production call site passes an explicit cap; adapters throw a
   * typed truncation error (ClaudeTruncationError / Player2TruncationError)
   * when the response hits it, so partial text is never returned or persisted.
   *
   * Band rationale (caps live at the call sites, with per-site comments):
   *
   * | Band | Cap        | Used by |
   * |------|------------|---------|
   * | tiny structured JSON      | 128–256  | retiredAdventurerReview (128); partyMember / inactivePlayer / xp / homebrew flavor / itemModification / recap / regionHistoryCompression (256) |
   * | structured JSON + lists   | 384      | interpretIntent, generateNpcReaction, loot (grant arrays), flaggedNpc core bundle |
   * | outcome + short hint      | 192      | yieldReview, defeatDisposition, fleeNarration |
   * | merged intent + routing   | 512      | interpretIntentAndRoute; also levelUp (3 perks), raceLore (structured lore) |
   * | conversational prose      | 768      | guidedIdentity kickoff/turn, guidedOpeningScene, backgroundStory (~2 paragraphs) |
   * | persisted long-form prose | 1024     | narrate (events are permanent), obituary (one-time memorial) |
   * | one-time bulk generation  | 2048–10240 | campaignGeneration bulk / additional region / single NPC / world-summary regen, flaggedNpc details (4096, tuned by 040.13) |
   *
   * Documented exceptions: settingsIpc's connectivity ping uses maxTokens: 1.
   *
   * 040.14: bands are starting points, not hard walls. The production provider
   * is wrapped in withTokenEscalation (tokenEscalation.ts): a truncated call is
   * automatically retried with a doubled cap (max 2 escalations, ceiling 8192),
   * so a legitimately large output — a long NPC speech, a side-effect-heavy
   * narration — recovers at bounded extra cost instead of failing the turn.
   */
  maxTokens?: number
}

export interface Provider {
  generate(prompt: string, context?: GenerateContext): Promise<string>
}

export interface MockProviderCall {
  prompt: string
  context?: GenerateContext
}

export interface MockProvider extends Provider {
  calls: MockProviderCall[]
}

export function createMockProvider(response: string): MockProvider {
  const calls: MockProviderCall[] = []
  return {
    calls,
    async generate(prompt: string, context?: GenerateContext): Promise<string> {
      calls.push({ prompt, context })
      return response
    }
  }
}
