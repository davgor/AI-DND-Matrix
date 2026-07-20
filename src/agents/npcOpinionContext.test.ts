import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { appendEvent } from '../db/repositories/events'
import { appendNpcMemory } from '../db/repositories/npcMemories'
import { createNpc } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { assembleNpcOpinionContext } from './npcOpinionContext'

function seedOpinionContextFixture(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Opinion Context',
    premisePrompt: 'test',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Harbor',
    description: 'A busy port.'
  })
  const hero = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Hero',
    characterClass: 'fighter',
    kind: 'player'
  })
  const speaker = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Mira',
    role: 'innkeeper',
    disposition: 'warm',
    canSpeak: true
  })
  const mute = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Rook',
    role: 'guard dog',
    disposition: 'wary',
    canSpeak: false
  })
  const other = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Bram',
    role: 'smith',
    disposition: 'neutral',
    canSpeak: true
  })
  return { campaign, hero, speaker, mute, other }
}

describe('assembleNpcOpinionContext: speaking memories', () => {
  it('loads only the subject NPC memories (isolation)', () => {
    const db = createTestDb()
    const { campaign, hero, speaker, other } = seedOpinionContextFixture(db)
    appendNpcMemory(db, { npcId: speaker.id, content: 'Mira remembers the hero bought ale.', tags: [] })
    appendNpcMemory(db, { npcId: other.id, content: 'Bram remembers unrelated gossip.', tags: [] })

    const context = assembleNpcOpinionContext(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      npc: speaker
    })

    expect(context.memories).toEqual([{ content: 'Mira remembers the hero bought ale.' }])
    expect(JSON.stringify(context)).not.toContain('Bram remembers unrelated gossip')
  })
})

describe('assembleNpcOpinionContext: speaking dialogue', () => {
  it('includes dialogue snippets for the subject NPC, not other NPC lines', () => {
    const db = createTestDb()
    const { campaign, hero, speaker, other } = seedOpinionContextFixture(db)
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'player_action',
      payload: { characterId: hero.id, playerInput: 'Hello Mira.' },
      timestamp: '2026-07-20T10:00:00.000Z'
    })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'npc_reaction',
      payload: {
        npcId: speaker.id,
        npcName: speaker.name,
        text: 'Welcome back, traveler.',
        reactionKind: 'dialogue'
      },
      timestamp: '2026-07-20T10:00:01.000Z'
    })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'npc_reaction',
      payload: {
        npcId: other.id,
        npcName: other.name,
        text: 'Need nails?',
        reactionKind: 'dialogue'
      },
      timestamp: '2026-07-20T10:00:02.000Z'
    })

    const context = assembleNpcOpinionContext(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      npc: speaker
    })

    expect(context.dialogueSnippets).toEqual(
      expect.arrayContaining(['Player: Hello Mira.', 'Mira: Welcome back, traveler.'])
    )
    expect(context.dialogueSnippets?.join('\n')).not.toContain('Need nails?')
  })
})

function seedMuteObservationEvents(
  db: ReturnType<typeof createTestDb>,
  fixture: ReturnType<typeof seedOpinionContextFixture>
): void {
  const { campaign, hero, mute } = fixture
  appendNpcMemory(db, { npcId: mute.id, content: 'Should not appear in non-speaker opinion.', tags: [] })
  appendEvent(db, {
    campaignId: campaign.id,
    type: 'npc_reaction',
    payload: {
      npcId: mute.id,
      npcName: mute.name,
      text: 'The hound growls softly.',
      reactionKind: 'action'
    },
    timestamp: '2026-07-20T11:00:00.000Z'
  })
  appendEvent(db, {
    campaignId: campaign.id,
    type: 'npc_reaction',
    payload: {
      npcId: mute.id,
      npcName: mute.name,
      text: 'It barks a warning.',
      reactionKind: 'dialogue'
    },
    timestamp: '2026-07-20T11:00:01.000Z'
  })
  appendEvent(db, {
    campaignId: campaign.id,
    type: 'combat_attack',
    payload: {
      attacker: { kind: 'player', id: hero.id },
      target: { kind: 'npc', id: mute.id },
      hit: true,
      damage: 3
    },
    timestamp: '2026-07-20T11:00:02.000Z'
  })
}

describe('assembleNpcOpinionContext: non-speaking path', () => {
  it('uses action and combat beats, not dialogue or private memories', () => {
    const db = createTestDb()
    const fixture = seedOpinionContextFixture(db)
    const { campaign, hero, mute } = fixture
    seedMuteObservationEvents(db, fixture)

    const context = assembleNpcOpinionContext(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      npc: mute
    })

    expect(context.memories).toBeUndefined()
    expect(context.dialogueSnippets).toBeUndefined()
    expect(context.actionBeats?.length).toBeGreaterThan(0)
    const serialized = JSON.stringify(context.actionBeats)
    expect(serialized).toContain('combat_attack')
    expect(serialized).toContain('npc_reaction')
    expect(serialized).not.toContain('barks a warning')
    expect(serialized).not.toContain('Should not appear')
  })
})
