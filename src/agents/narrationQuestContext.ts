import type Database from 'better-sqlite3'
import { listCharacterQuests, listQuestsByCampaign } from '../db/repositories/quests'
import { windowActiveQuestsForNarration, type ActiveQuestContext } from './questWindow'

export function loadActiveQuestsForCharacter(
  db: Database.Database,
  campaignId: string,
  characterId: string
): ActiveQuestContext[] {
  const campaignQuests = listQuestsByCampaign(db, campaignId)
  const characterQuests = listCharacterQuests(db, characterId)
  return windowActiveQuestsForNarration(campaignQuests, characterQuests)
}
