import { createTestDb } from './testUtils'
import { createCampaign } from './repositories/campaigns'
import { createRegion } from './repositories/regions'
import { createCharacter } from './repositories/characters'
import { createNpc, setNpcCombatStats } from './repositories/npcs'

export const GOBLIN_LOOT_RESPONSE = JSON.stringify({
  narrationText: 'You find a few coins on the goblin.',
  itemGrants: [
    {
      proposeNew: {
        name: 'Goblin Coin Pouch',
        description: 'A handful of copper.',
        itemType: 'misc',
        rarityTier: 'common'
      }
    }
  ],
  nothingToFind: false
})

export function initiativeRng() {
  let calls = 0
  return () => {
    calls += 1
    return calls === 1 ? 0.95 : 0.05
  }
}

export function attackRng(d20: number) {
  return () => (d20 - 1) / 20
}

export function seedCombatSmokeCampaign() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Combat Test',
    premisePrompt: 'A goblin ambush',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Road',
    description: 'A dusty road'
  })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    characterClass: 'fighter',
    kind: 'player',
    hp: 20,
    level: 1,
    stats: {
      abilityScores: { body: 14, agility: 16, mind: 10, presence: 10 },
      currentRegionId: region.id,
      weaponProficient: true
    }
  })
  const goblin = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Goblin',
    role: 'scout',
    disposition: 'hostile',
    skipCombatHydration: true
  })
  setNpcCombatStats(db, goblin.id, { hp: 10, maxHp: 10, ac: 12 })
  return { db, campaign, region, player, goblin }
}
