/**
 * Deterministic combat catch-up flavor templates (epic 040.6).
 *
 * Combat catch-up turns are flavor-only: hit/miss/damage are always resolved by
 * the engine in `combatResolvers.ts`. These templates replace the per-combatant
 * LLM calls (`generateNpcReaction` / `decidePartyMemberAction`) on that path so
 * a full catch-up sequence costs zero provider calls by default.
 *
 * The templates are keyed by temperament, disposition bucket (innately hostile
 * vs pressed into fighting), engine hit/miss, and speaking vs non-speaking.
 * Speaking NPCs get `reactionKind: 'dialogue'` with plain spoken text;
 * non-speaking NPCs get `reactionKind: 'action'` with **wrapped** third-person
 * prose, matching the epic 028 emphasis conventions.
 *
 * IMPORTANT (data-integrity item 9): this module must only be used from the
 * combat call sites (`resolveNpcCombatTurn` / `resolvePartyCombatTurn`), never
 * inside the shared agents — the non-combat path persists `reaction.text` as an
 * NPC memory and honors the LLM `attack` flag, and must keep using the LLM.
 */
import type { NpcReactionKind, Temperament } from '../shared/alignment/types'
import { wrapActionDescription } from '../shared/alignment/types'

/** Opt-in escape hatch restoring the LLM flavor path for manual QA. */
export function combatLlmFlavorEnabled(): boolean {
  return process.env['COMBAT_LLM_FLAVOR'] === 'true'
}

interface OutcomeLines {
  hitDialogue: string
  missDialogue: string
  hitAction: string
  missAction: string
}

interface TemperamentLines {
  hostile: OutcomeLines
  pressed: OutcomeLines
}

const NPC_COMBAT_LINES: Record<Temperament, TemperamentLines> = {
  aggressive: {
    hostile: {
      hitDialogue: 'Ha! You bleed like all the rest!',
      missDialogue: 'Stand still and die!',
      hitAction: '{name} slams into you with reckless fury.',
      missAction: '{name} lunges wildly, and the blow goes wide.'
    },
    pressed: {
      hitDialogue: 'You forced my hand — remember that!',
      missDialogue: 'Come on, then! I will not miss twice!',
      hitAction: '{name} strikes back with sudden ferocity.',
      missAction: '{name} swings hard in retaliation but fails to connect.'
    }
  },
  cautious: {
    hostile: {
      hitDialogue: 'Patience pays. That one hurt, did it not?',
      missDialogue: 'No matter. I pick my moments.',
      hitAction: '{name} waits for an opening and strikes true.',
      missAction: '{name} probes your guard, but the attack falls short.'
    },
    pressed: {
      hitDialogue: 'Stay back — I warned you!',
      missDialogue: 'I do not want this fight, but I will defend myself!',
      hitAction: '{name} lashes out defensively and finds its mark.',
      missAction: '{name} keeps its distance, striking without landing.'
    }
  },
  curious: {
    hostile: {
      hitDialogue: 'Fascinating — you bleed like the others.',
      missDialogue: 'Interesting. You are quicker than you look.',
      hitAction: '{name} darts in to test you and draws blood.',
      missAction: '{name} circles inquisitively, striking a moment too late.'
    },
    pressed: {
      hitDialogue: 'So that is how you fight — noted!',
      missDialogue: 'Wait — let us not be hasty!',
      hitAction: '{name} tries a sudden, experimental strike that lands.',
      missAction: '{name} feints and prods without finding a gap.'
    }
  },
  territorial: {
    hostile: {
      hitDialogue: 'This ground is mine!',
      missDialogue: 'Get out! Leave this place!',
      hitAction: '{name} defends its ground with a crushing blow.',
      missAction: '{name} charges to drive you off, but misses.'
    },
    pressed: {
      hitDialogue: 'You crossed the line — now pay for it!',
      missDialogue: 'Leave now, and this ends!',
      hitAction: '{name} shoves you back with a solid hit.',
      missAction: '{name} snaps at you while guarding its ground, and misses.'
    }
  },
  skittish: {
    hostile: {
      hitDialogue: 'S-stay away! See what happens when you press me?',
      missDialogue: 'Do not come any closer!',
      hitAction: '{name} strikes out in a panic and somehow connects.',
      missAction: '{name} flails nervously, nowhere near the mark.'
    },
    pressed: {
      hitDialogue: 'I did not want this! Why did you make me?',
      missDialogue: 'Please — just let me go!',
      hitAction: '{name} lashes out in desperation and lands a blow.',
      missAction: '{name} shrinks back, its frightened swipe missing wide.'
    }
  },
  disciplined: {
    hostile: {
      hitDialogue: 'Form and focus. You are outmatched.',
      missDialogue: 'A miss. It will not happen again.',
      hitAction: '{name} delivers a measured strike that lands cleanly.',
      missAction: '{name} attacks in perfect form, yet you slip aside.'
    },
    pressed: {
      hitDialogue: 'I take no pleasure in this. Yield.',
      missDialogue: 'Stand down. I will not ask again.',
      hitAction: '{name} counters with practiced precision.',
      missAction: '{name} advances in controlled steps, its strike turned aside.'
    }
  },
  cunning: {
    hostile: {
      hitDialogue: 'Predictable. You never saw it coming.',
      missDialogue: 'Clever. But I have more tricks than you have luck.',
      hitAction: '{name} feints left and strikes from your blind side.',
      missAction: '{name} angles for a dirty blow that does not land.'
    },
    pressed: {
      hitDialogue: 'You should have taken the easy way out.',
      missDialogue: 'Think carefully about your next step.',
      hitAction: '{name} turns your advance against you with a sly strike.',
      missAction: '{name} slips sideways and jabs, just missing.'
    }
  },
  mindless: {
    hostile: {
      hitDialogue: 'Crush... break...',
      missDialogue: 'Raaargh!',
      hitAction: '{name} smashes forward with brute force.',
      missAction: '{name} thrashes blindly and hits nothing.'
    },
    pressed: {
      hitDialogue: 'Hurrrt...',
      missDialogue: 'Grraaah!',
      hitAction: '{name} lurches at you and connects with a heavy blow.',
      missAction: '{name} lumbers forward, its wild swing missing.'
    }
  },
  neutral: {
    hostile: {
      hitDialogue: 'Nothing personal. This is just how it goes.',
      missDialogue: 'Hm. You are harder to pin down than most.',
      hitAction: '{name} presses the attack and lands a solid hit.',
      missAction: '{name} attacks, but the blow glances away.'
    },
    pressed: {
      hitDialogue: 'I did not start this, but I will finish it.',
      missDialogue: 'We can still end this without more blood!',
      hitAction: '{name} fights back and scores a telling blow.',
      missAction: '{name} defends itself with a swing that misses.'
    }
  }
}

export interface NpcCombatFlavorInput {
  npcName: string
  temperament: Temperament
  disposition: string
  canSpeak: boolean
  hit: boolean
}

export interface NpcCombatFlavor {
  reactionKind: NpcReactionKind
  text: string
}

function outcomeLinesFor(temperament: Temperament, disposition: string): OutcomeLines {
  const bucket = disposition.toLowerCase().includes('hostile') ? 'hostile' : 'pressed'
  return NPC_COMBAT_LINES[temperament][bucket]
}

export function buildNpcCombatFlavor(input: NpcCombatFlavorInput): NpcCombatFlavor {
  const lines = outcomeLinesFor(input.temperament, input.disposition)
  if (input.canSpeak) {
    return { reactionKind: 'dialogue', text: input.hit ? lines.hitDialogue : lines.missDialogue }
  }
  const template = input.hit ? lines.hitAction : lines.missAction
  return {
    reactionKind: 'action',
    text: wrapActionDescription(template.replaceAll('{name}', input.npcName))
  }
}

const PARTY_MEMBER_COMBAT_LINES = [
  '{name} presses the attack at your side.',
  '{name} moves to flank the nearest enemy, weapon ready.',
  '{name} covers your blind side, watching for an opening.',
  '{name} harries the enemy to keep their attention split.'
]

export function buildPartyMemberCombatFlavor(name: string): string {
  let seed = 0
  for (const char of name) {
    seed = (seed + (char.codePointAt(0) ?? 0)) % PARTY_MEMBER_COMBAT_LINES.length
  }
  const line = PARTY_MEMBER_COMBAT_LINES[seed]
  return line.replaceAll('{name}', name)
}
