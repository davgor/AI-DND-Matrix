import type { Character } from '../../../db/repositories/characters'
import { CharacterJournalSection } from '../characterSheet/CharacterJournalSection'
import { useJournalPersonLinks } from '../characterSheet/useJournalPersonLinks'
import './playSheetJournalOverlay.css'

export function PlaySheetJournalTab(props: {
  character: Character
  campaignId: string
  isOpen: boolean
  onClose: () => void
  onOpenNpcDossier: (npcId: string) => void
}): JSX.Element | null {
  const links = useJournalPersonLinks(props.campaignId, props.character.id)

  if (!props.isOpen) {
    return null
  }
  return (
    <div className="play-sheet-journal-overlay modal-overlay" role="presentation" onClick={props.onClose}>
      <div
        className="play-sheet-journal-modal modal-panel"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="play-sheet-journal-header">
          <h2>Journal</h2>
          <button type="button" aria-label="Close journal" onClick={props.onClose}>
            ×
          </button>
        </header>
        <CharacterJournalSection
          character={props.character}
          personCandidates={links.personCandidates}
          knownDossiers={links.knownDossiers}
          onOpenNpcDossier={props.onOpenNpcDossier}
        />
      </div>
    </div>
  )
}
