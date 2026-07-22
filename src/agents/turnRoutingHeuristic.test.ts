import { describe, expect, it } from 'vitest'
import type { IntentInterpretation } from './dm'
import {
  canSkipRoutingLlm,
  heuristicRoutingPlan,
  type TurnRoutingSignals
} from './turnRoutingHeuristic'

function signals(overrides: Partial<TurnRoutingSignals> = {}): TurnRoutingSignals {
  return {
    playerInput: 'Hello?',
    characterName: 'Kael',
    regionName: 'Oakhollow',
    presentNpcs: [{ id: 'npc-1', name: 'Mira', interactedBefore: true, isHostile: false }],
    activeQuestTexts: [],
    hasPendingAlignmentShift: false,
    hasPartyMembers: false,
    hasInactivePlayersInRegion: false,
    ...overrides
  }
}

function noCheck(): IntentInterpretation {
  return { checkNeeded: false }
}

function withCheck(): IntentInterpretation {
  return { checkNeeded: true, ability: 'agility', dc: 12, proficient: false }
}

describe('turnRoutingHeuristic: converse row', () => {
  it('routes a question to the single present, previously-met NPC without narration', () => {
    const plan = heuristicRoutingPlan(noCheck(), signals({ playerInput: 'What news from the mill?' }))

    expect(plan).toEqual({
      disposition: 'converse',
      beats: [{ kind: 'npcResponse', npcIds: ['npc-1'] }]
    })
  })

  it('treats an NPC name mention as a dialogue cue', () => {
    const plan = heuristicRoutingPlan(noCheck(), signals({ playerInput: 'Good to see you, Mira' }))

    expect(plan?.beats).toEqual([{ kind: 'npcResponse', npcIds: ['npc-1'] }])
  })

  it('treats ask/tell/say verbs as dialogue cues', () => {
    const plan = heuristicRoutingPlan(noCheck(), signals({ playerInput: 'I ask about the weather' }))

    expect(plan?.beats).toEqual([{ kind: 'npcResponse', npcIds: ['npc-1'] }])
  })

  it('returns null when more than one NPC is present', () => {
    const plan = heuristicRoutingPlan(
      noCheck(),
      signals({
        presentNpcs: [
          { id: 'npc-1', name: 'Mira', interactedBefore: true, isHostile: false },
          { id: 'npc-2', name: 'Brant', interactedBefore: true, isHostile: false }
        ]
      })
    )

    expect(plan).toBeNull()
  })

  it('returns null when the input carries no dialogue cue', () => {
    expect(heuristicRoutingPlan(noCheck(), signals({ playerInput: 'Hi' }))).toBeNull()
  })

  it('returns null when the input leads with a non-dialogue verb even with a cue', () => {
    expect(heuristicRoutingPlan(noCheck(), signals({ playerInput: 'I lunge at Mira' }))).toBeNull()
  })

  it('returns null on multi-clause input', () => {
    const plan = heuristicRoutingPlan(
      noCheck(),
      signals({ playerInput: 'Mira, tell me about the mill and then the river' })
    )

    expect(plan).toBeNull()
  })
})

describe('turnRoutingHeuristic: act row', () => {
  it('expresses a pure physical verb phrase deterministically in third person', () => {
    const plan = heuristicRoutingPlan(
      noCheck(),
      signals({ playerInput: 'I draw my sword', presentNpcs: [] })
    )

    expect(plan).toEqual({
      disposition: 'act',
      beats: [{ kind: 'playerActionExpression', actionDescription: 'Kael draws their sword.' }]
    })
  })

  it('swaps first-person pronouns in the expressed action', () => {
    const plan = heuristicRoutingPlan(
      noCheck(),
      signals({ playerInput: 'I brace myself', presentNpcs: [] })
    )

    expect(plan?.beats).toEqual([
      { kind: 'playerActionExpression', actionDescription: 'Kael braces themselves.' }
    ])
  })

  it('returns null for verbs outside the physical whitelist', () => {
    const plan = heuristicRoutingPlan(
      noCheck(),
      signals({ playerInput: 'I pick up the rope', presentNpcs: [] })
    )

    expect(plan).toBeNull()
  })

  it('returns null when a present NPC is named in the input', () => {
    const plan = heuristicRoutingPlan(
      noCheck(),
      signals({ playerInput: 'I draw my sword before Mira' })
    )

    expect(plan).toBeNull()
  })

  it('returns null on multi-clause physical input', () => {
    const plan = heuristicRoutingPlan(
      noCheck(),
      signals({ playerInput: 'I draw my sword and shield', presentNpcs: [] })
    )

    expect(plan).toBeNull()
  })
})

describe('turnRoutingHeuristic: check row', () => {
  it('plans expression + dmNarration for a physical, unaddressed check turn', () => {
    const plan = heuristicRoutingPlan(
      withCheck(),
      signals({ playerInput: 'I ready my shield', presentNpcs: [] })
    )

    expect(plan).toEqual({
      disposition: 'composite',
      beats: [
        { kind: 'playerActionExpression', actionDescription: 'Kael readies their shield.' },
        { kind: 'dmNarration' }
      ]
    })
  })

  it('plans dmNarration before npcResponse for a dialogue-cued check turn', () => {
    const plan = heuristicRoutingPlan(
      withCheck(),
      signals({ playerInput: 'Mira, can I slip past the toll gate?' })
    )

    expect(plan).toEqual({
      disposition: 'composite',
      beats: [{ kind: 'dmNarration' }, { kind: 'npcResponse', npcIds: ['npc-1'] }]
    })
  })

  it('defers non-physical unaddressed check turns to LLM routing', () => {
    const plan = heuristicRoutingPlan(
      withCheck(),
      signals({ playerInput: 'I test the knot', presentNpcs: [] })
    )

    expect(plan).toBeNull()
  })
})

describe('turnRoutingHeuristic: routing-bypass intents', () => {
  it('returns null when actionType is set (rest/travel/modifyItem bypass routing)', () => {
    const intent: IntentInterpretation = { checkNeeded: false, actionType: 'restShort' }

    expect(heuristicRoutingPlan(intent, signals())).toBeNull()
  })

  it('returns null when combatIntent is not none (combat path bypasses routing)', () => {
    const intent: IntentInterpretation = {
      checkNeeded: false,
      combatIntent: 'attack',
      targetNpcId: 'npc-1'
    }

    expect(heuristicRoutingPlan(intent, signals())).toBeNull()
  })
})

describe('turnRoutingHeuristic: side-effect starvation guard', () => {
  it('defers when an active quest mentions a present NPC name', () => {
    const guarded = signals({
      playerInput: 'What news, Mira?',
      activeQuestTexts: ['Ask Mira about the stolen amulet']
    })

    expect(heuristicRoutingPlan(noCheck(), guarded)).toBeNull()
  })

  it('defers when an active quest mentions a region keyword', () => {
    const guarded = signals({
      playerInput: 'I draw my sword',
      presentNpcs: [],
      activeQuestTexts: ['Investigate the strange lights over Oakhollow']
    })

    expect(heuristicRoutingPlan(noCheck(), guarded)).toBeNull()
  })

  it('still fires when active quests mention neither scene NPCs nor the region', () => {
    const clear = signals({
      playerInput: 'What news from the mill?',
      activeQuestTexts: ['Deliver the ledger to the harbormaster in Saltmarsh']
    })

    expect(heuristicRoutingPlan(noCheck(), clear)).not.toBeNull()
  })

  it('defers when a pending alignment shift is active', () => {
    const guarded = signals({ hasPendingAlignmentShift: true })

    expect(heuristicRoutingPlan(noCheck(), guarded)).toBeNull()
  })

  it('defers the first interaction with an NPC this session', () => {
    const guarded = signals({
      presentNpcs: [{ id: 'npc-1', name: 'Mira', interactedBefore: false, isHostile: false }]
    })

    expect(heuristicRoutingPlan(noCheck(), guarded)).toBeNull()
  })

  it('defers converse turns with a hostile NPC (combat or narration may follow)', () => {
    const guarded = signals({
      presentNpcs: [{ id: 'npc-1', name: 'Mira', interactedBefore: true, isHostile: true }]
    })

    expect(heuristicRoutingPlan(noCheck(), guarded)).toBeNull()
  })

  it('defers physical gestures while a hostile NPC is present', () => {
    const guarded = signals({
      playerInput: 'I draw my sword!',
      presentNpcs: [{ id: 'npc-2', name: 'Goblin', interactedBefore: true, isHostile: true }]
    })

    expect(heuristicRoutingPlan(noCheck(), guarded)).toBeNull()
  })
})

describe('turnRoutingHeuristic: starvation guard, transactional and shared-scene signals', () => {
  it.each([
    'Mira, will you sell me that rope?',
    'Can I buy the amulet, Mira?',
    'Mira, teach me the rites?',
    'Mira, will you give me the key?',
    'Should I pay the toll, Mira?',
    'Mira, can we trade stories?',
    'What can you teach me to learn, Mira?',
    'Mira, hand it over?',
    'Will you join me, Mira?'
  ])('defers transactional input: %s', (playerInput) => {
    expect(heuristicRoutingPlan(noCheck(), signals({ playerInput }))).toBeNull()
  })

  it('defers act-row transactional input even without an NPC', () => {
    const guarded = signals({ playerInput: 'I take everything', presentNpcs: [] })

    expect(heuristicRoutingPlan(noCheck(), guarded)).toBeNull()
  })

  it('defers when the player has AI party members (plans would omit partyMember beats)', () => {
    expect(heuristicRoutingPlan(noCheck(), signals({ hasPartyMembers: true }))).toBeNull()
  })

  it('defers when inactive player characters share the region (cross-character writes)', () => {
    const guarded = signals({ hasInactivePlayersInRegion: true })

    expect(heuristicRoutingPlan(noCheck(), guarded)).toBeNull()
  })
})

describe('turnRoutingHeuristic: world-alter starvation guard (130.4)', () => {
  it.each([
    'I burn the village',
    'I destroy the watchtower',
    'I collapse the bridge',
    'I massacre the garrison',
    'I raze Oakhollow',
    'I rebuild the hall'
  ])('defers world-alter input that must hit dmNarration: %s', (playerInput) => {
    expect(
      heuristicRoutingPlan(noCheck(), signals({ playerInput, presentNpcs: [] }))
    ).toBeNull()
  })

  it('still allows inert physical gestures without world-alter verbs', () => {
    expect(
      heuristicRoutingPlan(
        noCheck(),
        signals({ playerInput: 'I draw my sword', presentNpcs: [] })
      )
    ).not.toBeNull()
  })
})

describe('canSkipRoutingLlm (pre-LLM intent-only gate)', () => {
  it('is true for a converse-eligible turn', () => {
    expect(canSkipRoutingLlm(signals())).toBe(true)
  })

  it('is true for an act-eligible turn', () => {
    expect(canSkipRoutingLlm(signals({ playerInput: 'I draw my sword', presentNpcs: [] }))).toBe(
      true
    )
  })

  it('is false when no row fires', () => {
    expect(canSkipRoutingLlm(signals({ playerInput: 'I test the knot', presentNpcs: [] }))).toBe(
      false
    )
  })

  it('guarantees a deterministic plan for every non-bypass intent once it returns true', () => {
    const eligible = [
      signals(),
      signals({ playerInput: 'I draw my sword', presentNpcs: [] })
    ].filter(canSkipRoutingLlm)

    expect(eligible).toHaveLength(2)
    for (const candidate of eligible) {
      expect(heuristicRoutingPlan(noCheck(), candidate)).not.toBeNull()
      expect(heuristicRoutingPlan(withCheck(), candidate)).not.toBeNull()
    }
  })
})
