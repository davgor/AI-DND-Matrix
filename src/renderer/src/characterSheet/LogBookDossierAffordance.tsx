import type { LogEntry } from '../../../shared/logBook/types'

function LogBookOpenDossierButton(props: {
  relatedEntityId: string
  onOpenNpcDossier: (npcId: string) => void
}): JSX.Element {
  return (
    <button
      type="button"
      className="character-log-book-open-dossier"
      onClick={() => props.onOpenNpcDossier(props.relatedEntityId)}
    >
      Open dossier
    </button>
  )
}

export function logBookShowsDossierAffordance(
  category: LogEntry['category'],
  relatedEntityId: string | null,
  onOpenNpcDossier?: (npcId: string) => void
): relatedEntityId is string {
  return category === 'person' && relatedEntityId !== null && onOpenNpcDossier !== undefined
}

export { LogBookOpenDossierButton }
