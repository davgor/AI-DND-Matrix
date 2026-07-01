import type { CreateQuestInput, Quest, QuestObjective } from '../../shared/quests/types'

export function questDefaults(input: CreateQuestInput): {
  summary: string
  hookLine: string | null
  storyThreadId: string | null
  premiseAnchor: string | null
  regionId: string | null
  sourceWorldFactId: string | null
  scale: Quest['scale']
  objectives: QuestObjective[]
} {
  return {
    summary: input.summary ?? '',
    hookLine: input.hookLine ?? null,
    storyThreadId: input.storyThreadId ?? null,
    premiseAnchor: input.premiseAnchor ?? null,
    regionId: input.regionId ?? null,
    sourceWorldFactId: input.sourceWorldFactId ?? null,
    scale: input.scale ?? 'minor',
    objectives: input.objectives ?? []
  }
}
