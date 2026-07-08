import { describe, expect, it } from 'vitest'
import type { Event } from '../db/repositories/events'
import type { NpcMemory } from '../db/repositories/npcMemories'
import type { WorldFact } from '../db/repositories/worldFacts'
import type { LogEntry } from '../shared/logBook/types'
import {
  EVENT_TEXT_MAX_LENGTH,
  WORLD_FACT_WINDOW,
  slimEvent,
  slimEvents,
  slimLogEntries,
  slimLogEntry,
  slimNpcMemories,
  slimWorldFacts
} from './contextSlim'

function makeEvent(type: string, payload: Record<string, unknown>): Event {
  return {
    id: 'event-id-1234',
    campaignId: 'campaign-id-5678',
    timestamp: '2026-01-01T00:00:00.000Z',
    type,
    payload
  }
}

describe('slimEvent: field shape', () => {
  it('drops id, campaignId, timestamp, and the raw payload from every event', () => {
    const slim = slimEvent(
      makeEvent('player_action', {
        characterId: 'char-id-9',
        playerInput: 'I open the door',
        outcome: { success: true, total: 14, dc: 10 }
      })
    )
    expect(Object.keys(slim).sort()).toEqual(['summary', 'type'])
    const serialized = JSON.stringify(slim)
    expect(serialized).not.toContain('event-id-1234')
    expect(serialized).not.toContain('campaign-id-5678')
    expect(serialized).not.toContain('char-id-9')
  })

  it('carries narrationText through when the payload has one', () => {
    const slim = slimEvent(
      makeEvent('player_action', {
        characterId: 'char-id-9',
        narrationText: 'The door creaks open.',
        dmLineKind: 'flavor'
      })
    )
    expect(slim).toEqual({ type: 'player_action', narrationText: 'The door creaks open.' })
  })
})

describe('slimEvent: combat_attack summaries', () => {
  it('summarizes combat_attack from engine payload fields without ids', () => {
    const slim = slimEvent(
      makeEvent('combat_attack', {
        attacker: { kind: 'player', id: 'char-id-9' },
        target: { kind: 'npc', id: 'npc-id-3' },
        hit: true,
        crit: false,
        attackRoll: 15,
        attackTotal: 18,
        damage: 7,
        targetHpAfter: 2,
        targetDefeated: false
      })
    )
    expect(slim.type).toBe('combat_attack')
    expect(slim.summary).toBe('player hit npc for 7 damage')
    expect(JSON.stringify(slim)).not.toContain('npc-id-3')
  })

  it('marks missed and defeated combat_attack outcomes', () => {
    const miss = slimEvent(
      makeEvent('combat_attack', {
        attacker: { kind: 'npc', id: 'n' },
        target: { kind: 'player', id: 'p' },
        hit: false,
        damage: 0
      })
    )
    expect(miss.summary).toBe('npc missed player')

    const kill = slimEvent(
      makeEvent('combat_attack', {
        attacker: { kind: 'player', id: 'p' },
        target: { kind: 'npc', id: 'n' },
        hit: true,
        damage: 9,
        targetDefeated: true
      })
    )
    expect(kill.summary).toBe('player hit npc for 9 damage — target defeated')
  })
})

describe('slimEvent: actor and fallback summaries', () => {
  it('summarizes inactive_player_action and party_member_action from their content', () => {
    const inactive = slimEvent(
      makeEvent('inactive_player_action', { characterId: 'c', content: 'Lyra studies her map.' })
    )
    expect(inactive.summary).toBe('Lyra studies her map.')

    const party = slimEvent(
      makeEvent('party_member_action', {
        characterId: 'c',
        memberName: 'Brom',
        content: 'Brom covers the rear.'
      })
    )
    expect(party.summary).toBe('Brom: Brom covers the rear.')
  })

  it('summarizes npc_reaction, player_action_expression, and player_action input', () => {
    expect(
      slimEvent(makeEvent('npc_reaction', { npcId: 'n', npcName: 'Mira', text: 'Welcome back.' }))
        .summary
    ).toBe('Mira: Welcome back.')
    expect(
      slimEvent(
        makeEvent('player_action_expression', { actionDescription: '**Kael draws his sword.**' })
      ).summary
    ).toBe('**Kael draws his sword.**')
    expect(
      slimEvent(makeEvent('player_action', { playerInput: 'I sneak past', auditOnly: true })).summary
    ).toBe('Player: I sneak past')
  })

  it('falls back to a generic compact form for unknown types with descriptive text', () => {
    const slim = slimEvent(
      makeEvent('party_member_interaction', { characterId: 'c', content: 'shared a meal' })
    )
    expect(slim).toEqual({ type: 'party_member_interaction', summary: 'shared a meal' })
  })

  it('keeps unknown types without any descriptive text to the type alone', () => {
    const slim = slimEvent(
      makeEvent('combat_turn_advanced', { encounterId: 'e-1', round: 3, activeCombatant: {} })
    )
    expect(slim).toEqual({ type: 'combat_turn_advanced' })
  })
})

describe('slimEvent(s): bounded output size', () => {
  it('truncates oversized narration and summary text to the cap', () => {
    const long = 'x'.repeat(5000)
    const slim = slimEvent(makeEvent('player_action', { narrationText: long, playerInput: long }))
    expect(slim.narrationText?.length).toBeLessThanOrEqual(EVENT_TEXT_MAX_LENGTH)
    expect(slim.summary?.length).toBeLessThanOrEqual(EVENT_TEXT_MAX_LENGTH)
  })

  it('keeps a windowed batch of huge events within a fixed serialized budget', () => {
    const events = Array.from({ length: 20 }, (_, index) =>
      makeEvent('player_action', {
        characterId: `char-${index}`,
        narrationText: 'y'.repeat(10_000)
      })
    )
    const serialized = JSON.stringify(slimEvents(events))
    expect(serialized.length).toBeLessThanOrEqual(20 * (EVENT_TEXT_MAX_LENGTH * 2 + 100))
  })
})

describe('slimLogEntry / slimLogEntries', () => {
  const fullEntry: LogEntry = {
    id: 'entry-id-1',
    campaignId: 'campaign-id-2',
    characterId: 'character-id-3',
    category: 'person',
    title: 'Mira',
    content: 'Runs the store.',
    relatedEntityId: 'npc-mira',
    learnedInGameDate: 4,
    createdAt: '2026-01-01T00:00:00.000Z'
  }

  it('keeps id (required for amendment/deletion echo) and drops campaignId/characterId/dates', () => {
    expect(slimLogEntry(fullEntry)).toEqual({
      id: 'entry-id-1',
      category: 'person',
      title: 'Mira',
      content: 'Runs the store.',
      relatedEntityId: 'npc-mira'
    })
  })

  it('omits relatedEntityId when the row has none', () => {
    expect(slimLogEntry({ ...fullEntry, relatedEntityId: null })).toEqual({
      id: 'entry-id-1',
      category: 'person',
      title: 'Mira',
      content: 'Runs the store.'
    })
  })

  it('maps a batch preserving order', () => {
    const second: LogEntry = { ...fullEntry, id: 'entry-id-2', title: 'Wolf', category: 'beast' }
    expect(slimLogEntries([fullEntry, second]).map((entry) => entry.id)).toEqual([
      'entry-id-1',
      'entry-id-2'
    ])
  })
})

describe('slimWorldFacts', () => {
  function makeFact(index: number): WorldFact {
    return {
      id: `fact-${index}`,
      campaignId: 'campaign-id',
      regionId: 'region-id',
      factionTag: null,
      content: `Fact number ${index}`,
      createdAt: '2026-01-01T00:00:00.000Z'
    }
  }

  it('windows to the most recent facts and keeps content strings only', () => {
    const facts = Array.from({ length: 25 }, (_, index) => makeFact(index))
    const slim = slimWorldFacts(facts)
    expect(slim).toHaveLength(WORLD_FACT_WINDOW)
    expect(slim[0]).toBe(`Fact number ${25 - WORLD_FACT_WINDOW}`)
    expect(slim[slim.length - 1]).toBe('Fact number 24')
    expect(JSON.stringify(slim)).not.toContain('fact-')
  })

  it('returns all facts when under the window', () => {
    expect(slimWorldFacts([makeFact(0), makeFact(1)])).toEqual(['Fact number 0', 'Fact number 1'])
  })
})

describe('slimNpcMemories', () => {
  it('keeps content only, dropping ids, timestamps, and tags', () => {
    const memories: NpcMemory[] = [
      {
        id: 'memory-id-1',
        npcId: 'npc-id-1',
        timestamp: '2026-01-01T00:00:00.000Z',
        content: 'Sold the party a healing potion.',
        tags: ['commerce']
      }
    ]
    expect(slimNpcMemories(memories)).toEqual([{ content: 'Sold the party a healing potion.' }])
  })
})
