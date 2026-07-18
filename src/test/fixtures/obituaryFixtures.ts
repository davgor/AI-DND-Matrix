import type { createTestDb } from '../../db/testUtils'
import { createCampaign, updateCampaignStateSummary } from '../../db/repositories/campaigns'
import { createCharacter } from '../../db/repositories/characters'
import { createCharacterJournalEntry } from '../../db/repositories/characterJournalEntries'
import { createLogEntry } from '../../db/repositories/logEntries'
import { appendNpcMemory } from '../../db/repositories/npcMemories'
import { createNpc } from '../../db/repositories/npcs'
import { createRegion } from '../../db/repositories/regions'

export function seedObituaryFixture(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Fallen Kingdom',
    premisePrompt: 'A realm in mourning.',
    deathMode: 'legendary'
  })
  updateCampaignStateSummary(db, campaign.id, 'The border war has turned desperate.')
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Oakhollow',
    description: 'A quiet village.'
  })
  const character = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Elowen',
    characterClass: 'Ranger',
    kind: 'player'
  })
  db.prepare(
    `UPDATE characters SET identity_who = ?, identity_why = ?, identity_where = ?, identity_what = ?, opening_scene = ? WHERE id = ?`
  ).run('A ranger of the north', 'Protect realm', 'Oakhollow', 'Scout', 'Rain.', character.id)
  createCharacterJournalEntry(db, {
    campaignId: campaign.id,
    characterId: character.id,
    content: 'We held the bridge at dawn.',
    inGameDate: 3
  })
  const npc = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Bram',
    role: 'innkeeper',
    disposition: 'friendly',
    backstory: 'Once sheltered refugees.'
  })
  appendNpcMemory(db, { npcId: npc.id, content: 'Elowen bought stew on credit.', tags: [] })
  createLogEntry(db, {
    campaignId: campaign.id,
    characterId: character.id,
    category: 'person',
    title: 'Bram the innkeeper',
    content: 'Kind and watchful.',
    relatedEntityId: npc.id,
    learnedInGameDate: 2
  })
  return { campaign, character, npc }
}
