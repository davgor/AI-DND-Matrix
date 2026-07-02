import type { LogEntry } from '../shared/logBook/types'
import type { Quest } from '../shared/quests/types'
import { MAX_ACTIVE_QUESTS_IN_CONTEXT } from '../shared/quests/types'
import type { CharacterQuest } from '../shared/quests/types'

export interface ActiveQuestContext {
  id: string
  kind: Quest['kind']
  title: string
  summary: string
  hookLine: string | null
  objectives: Quest['objectives']
  acceptedInGameDate: number | null
}

export function windowActiveQuestsForNarration(
  quests: Quest[],
  characterQuests: CharacterQuest[],
  limit: number = MAX_ACTIVE_QUESTS_IN_CONTEXT
): ActiveQuestContext[] {
  const statusByQuestId = new Map(characterQuests.map((row) => [row.questId, row]))
  const active = quests
    .map((quest) => {
      const membership = statusByQuestId.get(quest.id)
      if (!membership || membership.status !== 'active') {
        return null
      }
      return {
        id: quest.id,
        kind: quest.kind,
        title: quest.title,
        summary: quest.summary,
        hookLine: quest.hookLine,
        objectives: quest.objectives,
        acceptedInGameDate: membership.acceptedInGameDate
      }
    })
    .filter((entry): entry is ActiveQuestContext => entry !== null)

  const main = active.filter((quest) => quest.kind === 'main')
  const sides = active
    .filter((quest) => quest.kind === 'side')
    .sort((a, b) => (b.acceptedInGameDate ?? 0) - (a.acceptedInGameDate ?? 0))
  return [...main, ...sides].slice(0, limit)
}

export function buildActiveQuestsPromptSection(activeQuests: ActiveQuestContext[]): string {
  if (activeQuests.length === 0) {
    return ''
  }
  return [
    `Active quests for this character (respect objectives; do not contradict completed quest state): ${JSON.stringify(activeQuests)}`,
    'Use questProposals for new side jobs, questUpdates to mark objective progress, questCompletions when a quest resolves.'
  ].join('\n')
}

export type { LogEntry }
