/**
 * 040.8: rules-first defeat disposition for speaking victors. A pure decision
 * table over victor alignment + backstory/role keywords + campaign death mode
 * replaces the LLM as the default path; the LLM is consulted only when the
 * table returns `ambiguous` (unknown alignment, unmarked evil victors, or an
 * execute call under legendary permadeath).
 *
 * `locationTag` is templated per disposition (imprison/ransom) so the
 * imprison/ransom continuity persisted into `playerDefeatState` and the
 * `player_defeated` event survives the move off the LLM path.
 */
import type { DeathMode } from '../db/repositories/campaigns'
import type { Alignment } from '../shared/alignment/types'
import type { DefeatDisposition, DefeatDispositionProposal } from '../shared/npcCombat/types'

export interface DefeatRuleInput {
  victorName: string
  role: string
  alignment: Alignment | null
  backstory: string
  deathMode: DeathMode
}

type DefeatRuleDecision =
  | { kind: 'proposal'; proposal: DefeatDispositionProposal }
  | { kind: 'ambiguous' }

const LAWFUL: readonly Alignment[] = ['lawful_good', 'lawful_neutral', 'lawful_evil']
const GOOD: readonly Alignment[] = ['lawful_good', 'neutral_good', 'chaotic_good']
const EVIL: readonly Alignment[] = ['lawful_evil', 'neutral_evil', 'chaotic_evil']

const LAW_KEEPER_KEYWORDS =
  /\b(guard|watch|watchman|soldier|captain|sheriff|constable|warden|knight|paladin|magistrate|marshal)\b/i
const OUTLAW_KEYWORDS = /\b(bandit|thief|outlaw|pirate|smuggler|raider|brigand|mercenary|cutthroat)\b/i
const KILLER_KEYWORDS = /\b(killer|executioner|assassin|butcher|merciless|ruthless)\b/i

interface DefeatRuleRow {
  /** Row matches only when the victor alignment is in this set. */
  alignments?: readonly Alignment[]
  /** Row matches only when role or backstory contains one of these keywords. */
  keywords?: RegExp
  /** Row matches only when the campaign death mode is in this set. */
  deathModes?: readonly DeathMode[]
  decide: DefeatDisposition | 'ambiguous'
}

/**
 * First matching row wins. Law-keeper keywords are checked before outlaw
 * keywords so "twenty years fighting raiders" backstories don't misfile a
 * guard as a bandit. Execute is only ever ruled in reversible death modes;
 * under legendary permadeath the call is deferred to the LLM.
 */
const DEFEAT_RULES: readonly DefeatRuleRow[] = [
  { alignments: LAWFUL, keywords: LAW_KEEPER_KEYWORDS, decide: 'imprison' },
  { alignments: GOOD, keywords: OUTLAW_KEYWORDS, decide: 'bury_out_back' },
  { alignments: [...EVIL, 'chaotic_neutral'], keywords: OUTLAW_KEYWORDS, decide: 'ransom' },
  { alignments: EVIL, keywords: KILLER_KEYWORDS, deathModes: ['standard', 'respawn'], decide: 'execute' },
  { alignments: EVIL, keywords: KILLER_KEYWORDS, deathModes: ['legendary'], decide: 'ambiguous' },
  { alignments: GOOD, decide: 'mercy_release' },
  { alignments: ['lawful_neutral', 'lawful_evil'], decide: 'imprison' },
  { alignments: ['true_neutral', 'chaotic_neutral'], decide: 'leave_unconscious' },
  { alignments: ['neutral_evil', 'chaotic_evil'], decide: 'ambiguous' }
]

const DEFEAT_NARRATION_TEMPLATES: Record<DefeatDisposition, (name: string) => string> = {
  imprison: (name) => `${name} binds your wrists and hauls you off to a cell.`,
  bury_out_back: (name) => `${name} drags you out back, and cold earth closes over you.`,
  leave_unconscious: (name) => `${name} leaves you unconscious in the dust.`,
  execute: (name) => `${name} stands over you and shows no mercy.`,
  ransom: (name) => `${name} ties you up and sends word demanding a ransom.`,
  mercy_release: (name) => `${name} lowers their weapon and lets you limp away with your life.`
}

const DEFEAT_LOCATION_TEMPLATES: Partial<Record<DefeatDisposition, (name: string) => string>> = {
  imprison: (name) => `a locked cell under ${name}'s watch`,
  ransom: (name) => `${name}'s camp, awaiting ransom`
}

export function defeatNarrationTemplate(victorName: string, disposition: DefeatDisposition): string {
  return DEFEAT_NARRATION_TEMPLATES[disposition](victorName)
}

export function defeatLocationTag(
  victorName: string,
  disposition: DefeatDisposition
): string | undefined {
  return DEFEAT_LOCATION_TEMPLATES[disposition]?.(victorName)
}

function rowMatches(row: DefeatRuleRow, input: DefeatRuleInput, matchText: string): boolean {
  if (row.alignments !== undefined && (input.alignment === null || !row.alignments.includes(input.alignment))) {
    return false
  }
  if (row.keywords !== undefined && !row.keywords.test(matchText)) {
    return false
  }
  return !(row.deathModes !== undefined && !row.deathModes.includes(input.deathMode))
}

function buildProposal(input: DefeatRuleInput, disposition: DefeatDisposition): DefeatRuleDecision {
  return {
    kind: 'proposal',
    proposal: {
      disposition,
      narrationText: defeatNarrationTemplate(input.victorName, disposition),
      locationTag: defeatLocationTag(input.victorName, disposition)
    }
  }
}

export function evaluateDefeatRules(input: DefeatRuleInput): DefeatRuleDecision {
  if (input.alignment === null) {
    return { kind: 'ambiguous' }
  }
  const matchText = `${input.role} ${input.backstory}`
  for (const row of DEFEAT_RULES) {
    if (!rowMatches(row, input, matchText)) {
      continue
    }
    if (row.decide === 'ambiguous') {
      return { kind: 'ambiguous' }
    }
    return buildProposal(input, row.decide)
  }
  return { kind: 'ambiguous' }
}
