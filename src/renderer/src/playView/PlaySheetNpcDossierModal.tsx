import { NpcDossierModal } from '../npcDossier/NpcDossierModal'
import { useNpcDossier } from '../npcDossier/useNpcDossier'

export function PlaySheetNpcDossierModal(props: {
  campaignId: string
  characterId: string
  npcId: string | null
  isOpen: boolean
  onClose: () => void
  onOpenNpcDossier?: (npcId: string) => void
}): JSX.Element {
  const dossierState = useNpcDossier(props.campaignId, props.characterId, props.npcId, props.isOpen)
  return (
    <NpcDossierModal
      dossier={dossierState.dossier}
      loading={dossierState.loading}
      error={dossierState.error}
      isOpen={props.isOpen}
      onClose={props.onClose}
      campaignId={props.campaignId}
      characterId={props.characterId}
      npcId={props.npcId}
      onOpenNpcFromWeb={props.onOpenNpcDossier}
    />
  )
}
