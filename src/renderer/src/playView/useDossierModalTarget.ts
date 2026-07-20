import { useState } from 'react'

export function useDossierModalTarget(): {
  dossierNpcId: string | null
  openDossier: (npcId: string) => void
  closeDossier: () => void
} {
  const [dossierNpcId, setDossierNpcId] = useState<string | null>(null)
  return {
    dossierNpcId,
    openDossier: (npcId) => setDossierNpcId(npcId),
    closeDossier: () => setDossierNpcId(null)
  }
}
