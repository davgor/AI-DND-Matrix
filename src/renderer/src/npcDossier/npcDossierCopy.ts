export const NPC_DOSSIER_EMPTY_PLACEHOLDER = '—'
export const NPC_DOSSIER_FACTS_EMPTY = 'No facts recorded yet'
export const NPC_DOSSIER_OPINION_EMPTY = 'Unable to summarize yet'
export const NPC_DOSSIER_DISPOSITION_EMPTY = 'No disposition recorded yet'
export const NPC_DOSSIER_OPINION_STALE_NOTE = 'Updating summary after recent interaction.'
export const NPC_DOSSIER_LOADING = 'Loading dossier…'
export const NPC_DOSSIER_RELATIONSHIP_WEB = 'Relationship web'

export function formatDossierTemperament(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function formatDossierRole(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
