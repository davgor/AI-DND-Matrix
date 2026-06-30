import type Database from 'better-sqlite3'
import { getCampaignById } from '../db/repositories/campaigns'
import { getCharacterById, type Character } from '../db/repositories/characters'
import { getNpcById } from '../db/repositories/npcs'
import type { Provider } from '../agents/providers/types'
import { proposeDefeatDisposition } from '../agents/defeatDisposition'
import { applyPlayerDefeatOutcome, isPlayerImprisoned } from './playerDefeat'

interface CatchUpSummary {
  lastAttackerNpcId?: string
}

export async function resolveDefeatDispositionBeat(input: {
  db: Database.Database
  provider: Provider
  campaignId: string
  character: Character
  catchUp: CatchUpSummary
}): Promise<{ defeatDispositionNarration?: string; playerImprisoned?: boolean }> {
  const playerAfter = getCharacterById(input.db, input.character.id)
  if (!playerAfter || playerAfter.hp > 0 || !input.catchUp.lastAttackerNpcId) {
    return { playerImprisoned: isPlayerImprisoned(input.character) }
  }
  const victor = getNpcById(input.db, input.catchUp.lastAttackerNpcId)
  const campaign = getCampaignById(input.db, input.campaignId)
  if (!victor || !campaign) {
    return { playerImprisoned: isPlayerImprisoned(playerAfter) }
  }
  const proposal = await proposeDefeatDisposition(input.provider, {
    victor,
    player: playerAfter,
    deathMode: campaign.deathMode,
    encounterSummary: 'The player was defeated in combat.'
  })
  const defeat = applyPlayerDefeatOutcome({
    db: input.db,
    campaignId: input.campaignId,
    characterId: input.character.id,
    victorNpcId: victor.id,
    proposal,
    deathMode: campaign.deathMode
  })
  return {
    defeatDispositionNarration: defeat.narrationText,
    playerImprisoned: isPlayerImprisoned(getCharacterById(input.db, input.character.id) as Character)
  }
}
