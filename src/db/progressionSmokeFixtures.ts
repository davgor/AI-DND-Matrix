import { createTestDb } from './testUtils'
import { createCampaign } from './repositories/campaigns'
import { createCharacter } from './repositories/characters'
import { createRegion } from './repositories/regions'
import { createNpc, setNpcEncounterOutcome } from './repositories/npcs'
import { appendEvent } from './repositories/events'
import { createCharacterJournalEntry } from './repositories/characterJournalEntries'
import { createStoryThread } from './repositories/storyThreads'
import type { CombatEncounter } from '../shared/combat/types'

export const COMBAT_XP_RESPONSE = JSON.stringify({
  narrationText: 'The bandit fight honed your instincts.',
  xpAmount: 80
})

export const QUEST_XP_RESPONSE = JSON.stringify({
  narrationText: 'Completing the errand brought insight.',
  xpAmount: 80
})

export const COMBAT_LOOT_RESPONSE = JSON.stringify({
  narrationText: 'You find a coin pouch.',
  itemGrants: [
    {
      proposeNew: {
        name: 'Bandit Coins',
        description: 'A few coins.',
        itemType: 'misc',
        rarityTier: 'common'
      }
    }
  ],
  nothingToFind: false
})

export const COMBAT_LEVEL_UP_RESPONSE = JSON.stringify({
  narrationText: 'Battle hardens you.',
  perks: [
    { id: 'm1', name: 'Battle Hardened', description: 'Blows glance off.', category: 'ac_bonus', flavorTags: ['martial'] },
    { id: 'm2', name: 'Relentless Strike', description: 'Strike again.', category: 'extra_attack', flavorTags: ['combat'] },
    { id: 'm3', name: 'Veteran Endurance', description: 'More grit.', category: 'hp_max_bonus', flavorTags: ['martial'] }
  ]
})

export const ARCANE_LEVEL_UP_RESPONSE = JSON.stringify({
  narrationText: 'Your studies crystallize into new talent.',
  perks: [
    {
      id: 'arc-spell',
      name: 'Arcane Spark',
      description: 'A cantrip lodges in your thoughts.',
      category: 'spell_access',
      flavorTags: ['arcane'],
      catalogSpellKey: 'firebolt'
    },
    {
      id: 'arc-mind',
      name: 'Scholar\'s Eye',
      description: 'You read people and tomes alike.',
      category: 'check_proficiency',
      flavorTags: ['arcane'],
      proficiencyAbility: 'mind'
    },
    {
      id: 'arc-feat',
      name: 'Mystic Resonance',
      description: 'Latent power hums beneath your skin.',
      category: 'custom_feature',
      flavorTags: ['arcane']
    }
  ]
})

function makeEncounter(campaignId: string, npcId: string, playerId: string): CombatEncounter {
  return {
    id: 'enc-smoke',
    campaignId,
    phase: 'resolved',
    outcome: 'defeated',
    initiativeOrder: [],
    activeTurnIndex: 0,
    round: 2,
    participantIds: [
      { kind: 'player', id: playerId },
      { kind: 'npc', id: npcId }
    ],
    pursuitState: 'engaged',
    exitedCombatantIds: [],
    startedAt: new Date().toISOString()
  }
}

export function seedCombatProgressionFixture() {
  const db = createTestDb()
  const campaign = createCampaign(db, { name: 'Progression', premisePrompt: 'xp', deathMode: 'standard' })
  const region = createRegion(db, { campaignId: campaign.id, name: 'Road', description: 'Dusty road' })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Fighter',
    characterClass: 'fighter',
    kind: 'player',
    level: 1,
    xp: 270
  })
  const bandit = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Bandit',
    role: 'thug',
    disposition: 'hostile'
  })
  setNpcEncounterOutcome(db, bandit.id, 'slain')
  for (let i = 0; i < 3; i += 1) {
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'combat_attack',
      payload: { characterId: player.id, activityTag: 'combat' }
    })
  }
  return { db, campaign, region, player, bandit, encounter: makeEncounter(campaign.id, bandit.id, player.id) }
}

export function seedArcaneProgressionFixture() {
  const db = createTestDb()
  const campaign = createCampaign(db, { name: 'Arcane', premisePrompt: 'study', deathMode: 'standard' })
  const region = createRegion(db, { campaignId: campaign.id, name: 'City', description: 'Library quarter' })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Scholar',
    characterClass: 'fighter',
    kind: 'player',
    level: 1,
    xp: 270
  })
  createCharacterJournalEntry(db, {
    campaignId: campaign.id,
    characterId: player.id,
    content: 'Long hours in the library studying spell theory and arcane notation.',
    inGameDate: 2
  })
  for (let i = 0; i < 4; i += 1) {
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'player_action',
      payload: { characterId: player.id, activityTag: 'arcane', playerInput: 'Study spells at the library' }
    })
  }
  const thread = createStoryThread(db, {
    campaignId: campaign.id,
    title: 'Research favor',
    state: 'completed',
    summary: 'Organize the archivist\'s spell folios.'
  })
  return { db, campaign, region, player, thread }
}
