import { isLootCompletedState } from '../shared/loot/types'
import type { QuestScale } from '../shared/loot/types'
import type { Quest, QuestObjective, QuestStatus } from '../shared/quests/types'

const MAJOR_TITLE_KEYWORDS = [
  'quest',
  'mission',
  'dragon',
  'cult',
  'ritual',
  'dungeon',
  'rescue',
  'ancient',
  'prophecy'
] as const

const MAJOR_SUMMARY_THRESHOLD = 200

const VALID_TRANSITIONS: Record<QuestStatus, readonly QuestStatus[]> = {
  available: ['active', 'abandoned'],
  active: ['completed', 'failed', 'abandoned'],
  completed: [],
  failed: [],
  abandoned: []
}

export function canTransitionQuestStatus(from: QuestStatus, to: QuestStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to)
}

export function validateObjectiveUpdate(
  objectives: QuestObjective[],
  completedIndex: number
): QuestObjective[] | null {
  if (!Number.isInteger(completedIndex) || completedIndex < 0 || completedIndex >= objectives.length) {
    return null
  }
  return objectives.map((objective, index) =>
    index === completedIndex ? { ...objective, done: true } : objective
  )
}

export function isQuestComplete(status: QuestStatus): boolean {
  return status === 'completed'
}

export function isQuestRewardEligibleStatus(status: QuestStatus): boolean {
  return isQuestComplete(status)
}

export function inferQuestScale(quest: Pick<Quest, 'title' | 'summary' | 'kind'>): QuestScale {
  if (quest.kind === 'main') {
    return 'major'
  }
  if (quest.summary.length > MAJOR_SUMMARY_THRESHOLD) {
    return 'major'
  }
  const lowerTitle = quest.title.toLowerCase()
  const hasMajorKeyword = MAJOR_TITLE_KEYWORDS.some((keyword) => lowerTitle.includes(keyword))
  return hasMajorKeyword ? 'major' : 'minor'
}

export function storyThreadStateToQuestStatus(state: string): QuestStatus | null {
  if (isLootCompletedState(state)) {
    return 'completed'
  }
  if (state === 'failed') {
    return 'failed'
  }
  if (state === 'abandoned') {
    return 'abandoned'
  }
  return 'active'
}

export function objectiveTextsToChecklist(texts: string[]): QuestObjective[] {
  return texts.map((text, index) => ({
    id: `obj-${index + 1}`,
    text,
    done: false
  }))
}
