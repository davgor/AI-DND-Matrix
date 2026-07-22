import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createNpc } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { appendEvent } from '../db/repositories/events'
import { buildNarrationLog } from './narrationLog'
import { writeCompanionFaceTokenAsset } from './companionFaceTokenAsset'
import { writeNpcFaceTokenAsset } from './npcFaceTokenAsset'
import { persistCreatureTokenAsset } from './creatureTokenAsset'
import { createBestiarySpecies } from '../db/repositories/bestiary'

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

describe('buildNarrationLog: player_action mapping', () => {
  it('maps legacy player_action events with playerInput and narrationText', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'player_action',
      payload: { characterId: 'c1', playerInput: 'I sneak past', narrationText: 'You slip by unseen.' }
    })

    const log = buildNarrationLog(db, campaign.id)

    expect(log).toEqual([
      expect.objectContaining({ speaker: 'player', text: 'I sneak past', playerLineKind: 'raw' }),
      expect.objectContaining({ speaker: 'dm', text: 'You slip by unseen.' })
    ])
  })

  it('hides audit-only player_action events from the feed', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'player_action',
      payload: { characterId: 'c1', playerInput: 'secret', auditOnly: true }
    })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'player_action',
      payload: { characterId: 'c1', narrationText: 'The door creaks open.' }
    })

    const log = buildNarrationLog(db, campaign.id)

    expect(log).toEqual([expect.objectContaining({ speaker: 'dm', text: 'The door creaks open.' })])
  })
})

describe('buildNarrationLog: player action expression', () => {
  it('maps player_action_expression to the action line (utterance is a separate player_action event)', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'player_action',
      payload: { characterId: 'c1', playerInput: 'I draw my sword' }
    })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'player_action_expression',
      payload: {
        characterId: 'c1',
        playerInput: 'I draw my sword',
        actionDescription: '**Kael draws his sword.**'
      }
    })

    expect(buildNarrationLog(db, campaign.id)).toEqual([
      expect.objectContaining({
        speaker: 'player',
        text: 'I draw my sword',
        playerLineKind: 'raw'
      }),
      expect.objectContaining({
        speaker: 'player',
        text: 'Kael draws his sword.',
        playerLineKind: 'actionExpression',
        reactionKind: 'action'
      })
    ])
  })
})

describe('buildNarrationLog: expression without utterance', () => {
  it('maps action expression alone when no separate utterance event exists', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'player_action_expression',
      payload: {
        characterId: 'c1',
        actionDescription: '**Kael draws his sword.**'
      }
    })

    expect(buildNarrationLog(db, campaign.id)).toEqual([
      expect.objectContaining({
        speaker: 'player',
        text: 'Kael draws his sword.',
        playerLineKind: 'actionExpression'
      })
    ])
  })
})

describe('buildNarrationLog: npc npcId', () => {
  it('copies npcId from npc_reaction payload when present', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'npc_reaction',
      payload: {
        dialogue: 'Welcome, traveler.',
        npcName: 'Mira',
        npcId: 'npc-mira'
      }
    })

    expect(buildNarrationLog(db, campaign.id)).toEqual([
      expect.objectContaining({
        speaker: 'npc',
        text: 'Welcome, traveler.',
        speakerName: 'Mira',
        npcId: 'npc-mira'
      })
    ])
  })
})

describe('buildNarrationLog: npc face token', () => {
  it('includes faceTokenPath when the NPC has a stored face token asset', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
    const region = createRegion(db, {
      campaignId: campaign.id,
      name: 'Oakhollow',
      description: 'A village.'
    })
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Mira',
      role: 'innkeeper',
      disposition: 'friendly'
    })
    const baseDir = mkdtempSync(join(tmpdir(), 'narration-log-face-token-'))
    try {
      const tokenPath = writeNpcFaceTokenAsset({
        baseDir,
        campaignId: campaign.id,
        npcId: npc.id,
        bytesBase64: PNG_BASE64,
        mimeType: 'image/png'
      })
      expect(tokenPath).toBeTruthy()
      db.prepare('UPDATE npcs SET face_token_path = ? WHERE id = ?').run(tokenPath, npc.id)
      appendEvent(db, {
        campaignId: campaign.id,
        type: 'npc_reaction',
        payload: {
          dialogue: 'Welcome, traveler.',
          npcName: 'Mira',
          npcId: npc.id
        }
      })

      expect(buildNarrationLog(db, campaign.id)).toEqual([
        expect.objectContaining({
          speaker: 'npc',
          npcId: npc.id,
          faceTokenPath: tokenPath
        })
      ])
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

function seedCompanionWithOptionalPortrait(
  db: ReturnType<typeof createTestDb>,
  portraitPath?: string
) {
  const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Asha',
    characterClass: 'fighter',
    kind: 'player'
  })
  const companion = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Bryn',
    characterClass: 'ranger',
    kind: 'ai_party_member',
    ownerPlayerCharacterId: player.id,
    ...(portraitPath !== undefined ? { portraitPath } : {})
  })
  return { campaign, companion }
}

describe('buildNarrationLog: companion face token present', () => {
  it('includes faceTokenPath when the companion has a stored portrait asset', () => {
    const db = createTestDb()
    const { campaign, companion } = seedCompanionWithOptionalPortrait(db)
    const baseDir = mkdtempSync(join(tmpdir(), 'narration-log-companion-face-'))
    try {
      const tokenPath = writeCompanionFaceTokenAsset({
        baseDir,
        campaignId: campaign.id,
        companionId: companion.id,
        bytesBase64: PNG_BASE64,
        mimeType: 'image/png'
      })
      expect(tokenPath).toBeTruthy()
      db.prepare('UPDATE characters SET portrait_path = ? WHERE id = ?').run(tokenPath, companion.id)
      appendEvent(db, {
        campaignId: campaign.id,
        type: 'party_member_action',
        payload: {
          content: 'Bryn watches the treeline.',
          memberName: 'Bryn',
          characterId: companion.id
        }
      })
      expect(buildNarrationLog(db, campaign.id)).toEqual([
        expect.objectContaining({
          speaker: 'partyMember',
          partyMemberId: companion.id,
          faceTokenPath: tokenPath
        })
      ])
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('buildNarrationLog: companion face token missing', () => {
  it('omits faceTokenPath when the companion has no portrait asset', () => {
    const db = createTestDb()
    const { campaign, companion } = seedCompanionWithOptionalPortrait(db)
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'party_member_action',
      payload: {
        content: 'Bryn nods.',
        memberName: 'Bryn',
        characterId: companion.id
      }
    })
    const entry = buildNarrationLog(db, campaign.id)[0]
    expect(entry?.speaker).toBe('partyMember')
    expect(entry?.faceTokenPath).toBeUndefined()
  })
})

function seedEnemyWolfReaction(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Wilds',
    description: 'Open moor.'
  })
  const species = createBestiarySpecies(db, {
    campaignId: campaign.id,
    key: 'gray-wolf',
    name: 'Gray Wolf',
    baseLore: 'Pack hunters.',
    buckets: ['beast'],
    tags: ['wolf']
  })
  const foe = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Gray Wolf',
    role: 'enemy',
    disposition: 'hostile',
    canSpeak: false,
    bestiarySpeciesId: species.id,
    bestiaryVariantKey: 'standard'
  })
  return { campaign, species, foe }
}

describe('buildNarrationLog: enemy creature token resolved', () => {
  it('includes faceTokenPath from species creature token for non-speaking enemy NPC lines', () => {
    const db = createTestDb()
    const { campaign, species, foe } = seedEnemyWolfReaction(db)
    const baseDir = mkdtempSync(join(tmpdir(), 'narration-log-creature-token-'))
    try {
      const tokenPath = persistCreatureTokenAsset(db, {
        speciesId: species.id,
        campaignId: campaign.id,
        bytesBase64: PNG_BASE64,
        mimeType: 'image/png',
        baseDir
      })
      appendEvent(db, {
        campaignId: campaign.id,
        type: 'npc_reaction',
        payload: {
          text: '**The wolf lunges.**',
          reactionKind: 'action',
          npcId: foe.id
        }
      })

      expect(buildNarrationLog(db, campaign.id)).toEqual([
        expect.objectContaining({
          speaker: 'npc',
          npcId: foe.id,
          faceTokenPath: tokenPath
        })
      ])
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('buildNarrationLog: enemy creature token missing', () => {
  it('omits faceTokenPath when species creature token file is missing', () => {
    const db = createTestDb()
    const { campaign, species, foe } = seedEnemyWolfReaction(db)
    db.prepare('UPDATE bestiary_species SET creature_token_path = ? WHERE id = ?').run(
      '/tmp/missing-creature-token.png',
      species.id
    )
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'npc_reaction',
      payload: {
        text: '**The wolf lunges.**',
        reactionKind: 'action',
        npcId: foe.id
      }
    })

    const entry = buildNarrationLog(db, campaign.id)[0]
    expect(entry?.faceTokenPath).toBeUndefined()
  })
})

describe('buildNarrationLog: npc and party mapping', () => {
  it('maps npc_reaction and party_member_action events to single entries', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
    appendEvent(db, { campaignId: campaign.id, type: 'npc_reaction', payload: { dialogue: 'Halt!' } })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'party_member_action',
      payload: { content: 'Brom scouts ahead.' }
    })

    const log = buildNarrationLog(db, campaign.id)

    expect(log.map((entry) => entry.text)).toEqual(['Halt!', 'Brom scouts ahead.'])
    expect(log.map((entry) => entry.speaker)).toEqual(['npc', 'partyMember'])
  })

  it('strips action markers and preserves reactionKind for non-speaking NPC reactions', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'npc_reaction',
      payload: {
        text: '**The wolf lunges at your throat.**',
        reactionKind: 'action'
      }
    })

    const log = buildNarrationLog(db, campaign.id)

    expect(log).toEqual([
      expect.objectContaining({
        speaker: 'npc',
        text: 'The wolf lunges at your throat.',
        reactionKind: 'action'
      })
    ])
  })
})

describe('buildNarrationLog: rest, travel, and dying_resolution', () => {
  it('splits rest and travel events into a player entry and a dm entry, since both store playerInput', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'rest',
      payload: { playerInput: 'I make camp', narrationText: 'You rest.' }
    })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'travel',
      payload: { playerInput: 'We travel north', narrationText: '2 days pass.' }
    })

    const log = buildNarrationLog(db, campaign.id)

    expect(log.map((entry) => ({ speaker: entry.speaker, text: entry.text }))).toEqual([
      { speaker: 'player', text: 'I make camp' },
      { speaker: 'dm', text: 'You rest.' },
      { speaker: 'player', text: 'We travel north' },
      { speaker: 'dm', text: '2 days pass.' }
    ])
  })

  it('maps a dying_resolution event to a single dm entry with no player input', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'dying_resolution',
      payload: { narrationText: 'You stabilize.' }
    })

    const log = buildNarrationLog(db, campaign.id)

    expect(log).toEqual([expect.objectContaining({ speaker: 'dm', text: 'You stabilize.' })])
  })

  it('ignores unrelated event types', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
    appendEvent(db, { campaignId: campaign.id, type: 'region_destroyed', payload: {} })

    expect(buildNarrationLog(db, campaign.id)).toEqual([])
  })
})
