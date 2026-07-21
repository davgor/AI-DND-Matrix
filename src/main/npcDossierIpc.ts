import { ipcMain } from 'electron'
import { generateNpcOpinionSummary } from '../agents/npcOpinion'
import { assembleNpcOpinionContext } from '../agents/npcOpinionContext'
import { buildAgentProvider } from './campaignIpc'
import { getDb } from './db'
import { getNpcDossier, type GetNpcDossierInput } from './npcDossier'

export function registerNpcDossierHandlers(): void {
  ipcMain.handle('npcDossier:get', async (_event, input: GetNpcDossierInput) => {
    const db = getDb()
    return getNpcDossier(db, input, {
      generateOpinion: async ({ npc, characterId }) => {
        const context = assembleNpcOpinionContext(db, {
          campaignId: input.campaignId,
          characterId,
          npc
        })
        return generateNpcOpinionSummary(buildAgentProvider(), context)
      }
    })
  })
}
