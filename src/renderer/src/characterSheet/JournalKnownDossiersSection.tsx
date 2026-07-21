import type { JournalKnownDossier } from '../../../shared/journal/types'

export interface JournalKnownDossiersSectionProps {
  dossiers: JournalKnownDossier[]
  onOpenNpcDossier?: (npcId: string) => void
}

function KnownDossierRow(props: {
  dossier: JournalKnownDossier
  onOpenNpcDossier?: (npcId: string) => void
}): JSX.Element {
  const { dossier, onOpenNpcDossier } = props
  if (onOpenNpcDossier === undefined) {
    return <li className="character-journal-known-dossiers-row">{dossier.name}</li>
  }
  return (
    <li className="character-journal-known-dossiers-row">
      <button
        type="button"
        className="character-journal-known-dossiers-open"
        onClick={() => onOpenNpcDossier(dossier.npcId)}
      >
        {dossier.name}
      </button>
    </li>
  )
}

export function JournalKnownDossiersSection(
  props: JournalKnownDossiersSectionProps
): JSX.Element {
  return (
    <section className="character-journal-known-dossiers">
      <h4>Known dossiers</h4>
      {props.dossiers.length === 0 ? (
        <p className="character-sheet-empty">No dossiers generated yet.</p>
      ) : (
        <ul className="character-journal-known-dossiers-list">
          {props.dossiers.map((dossier) => (
            <KnownDossierRow
              key={dossier.npcId}
              dossier={dossier}
              onOpenNpcDossier={props.onOpenNpcDossier}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
