import { LEVEL_XP_THRESHOLDS } from './xp'
import type {
  EncounterDifficulty,
  XPContext,
  XPSource,
  XpFoeSummary
} from '../shared/progression/types'

/**
 * XP is a fixed fraction of the character's current level-up span (the gap
 * between their level's threshold and the next). A medium accomplishment is
 * worth the same fraction of a level at level 2 and level 12, so pacing is
 * level-independent: ~10 medium encounters (or fewer harder ones) per level.
 */
export const DIFFICULTY_XP_SPAN_FRACTION: Record<EncounterDifficulty, number> = {
  easy: 0.05,
  medium: 0.1,
  hard: 0.2,
  extreme: 0.35,
  impossible: 0.6
}

const XP_EARNING_OUTCOMES = new Set(['slain', 'incapacitated', 'surrender'])

function levelXpSpan(playerLevel: number): number {
  const index = Math.max(1, Math.min(playerLevel, LEVEL_XP_THRESHOLDS.length - 1))
  return LEVEL_XP_THRESHOLDS[index] - LEVEL_XP_THRESHOLDS[index - 1]
}

/** Pure engine function — no DB or LLM imports. */
export function resolveDifficultyXP(difficulty: EncounterDifficulty, playerLevel: number): number {
  const amount = Math.floor(levelXpSpan(playerLevel) * DIFFICULTY_XP_SPAN_FRACTION[difficulty])
  return Math.max(1, amount)
}

/** Deterministic rating used when the agent never returns a valid difficulty. */
export function fallbackDifficulty(ctx: XPContext): EncounterDifficulty {
  if (ctx.source === 'quest_complete' && ctx.questScale === 'major') {
    return 'hard'
  }
  return 'medium'
}

function hasXpEarningFoes(foes: XpFoeSummary[]): boolean {
  return foes.some((foe) => XP_EARNING_OUTCOMES.has(foe.outcome))
}

/** Encounters where every foe fled award nothing; quest completions always award. */
export function shouldSkipXpPass(ctx: XPContext): boolean {
  return ctx.source === 'encounter_end' && !hasXpEarningFoes(ctx.foes)
}

const ENCOUNTER_NARRATION: Record<EncounterDifficulty, string> = {
  easy: 'The fight barely tested you, but every scrap sharpens your instincts.',
  medium: 'A solid clash — you come away steadier and wiser for it.',
  hard: 'That was a hard-won victory, and the lessons of it settle deep.',
  extreme: 'You survived something that should have broken you; you will not forget how.',
  impossible: 'Against all reason you prevailed — the tale alone will outlive you.'
}

const QUEST_NARRATION: Record<EncounterDifficulty, string> = {
  easy: 'A simple task, neatly done — small lessons still count.',
  medium: 'The undertaking tested your resolve, and you grew for seeing it through.',
  hard: 'Seeing that through demanded everything you had; you emerge changed.',
  extreme: 'Few would have finished what you just did — the experience marks you.',
  impossible: 'What you accomplished defies belief; you carry its weight and its wisdom.'
}

export function difficultyXpNarration(difficulty: EncounterDifficulty, source: XPSource): string {
  return source === 'quest_complete' ? QUEST_NARRATION[difficulty] : ENCOUNTER_NARRATION[difficulty]
}
