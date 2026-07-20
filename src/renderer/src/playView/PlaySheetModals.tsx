import type { Character } from '../../../db/repositories/characters'
import { PlaySheetNpcDossierModal } from './PlaySheetNpcDossierModal'
import { PlaySheetOverlayModals } from './PlaySheetOverlayModals'
import { usePlaySheetModals } from './usePlaySheetModals'

export { usePlaySheetModals }

export function PlaySheetModals(props: {
  character: Character
  campaignId: string
  refreshToken: number
  modals: ReturnType<typeof usePlaySheetModals>
}): JSX.Element {
  return (
    <>
      <PlaySheetOverlayModals
        character={props.character}
        campaignId={props.campaignId}
        refreshToken={props.refreshToken}
        modals={props.modals}
      />
      <PlaySheetNpcDossierModal
        campaignId={props.campaignId}
        characterId={props.character.id}
        npcId={props.modals.dossierNpcId}
        isOpen={props.modals.dossierNpcId !== null}
        onClose={props.modals.closeDossier}
      />
    </>
  )
}
