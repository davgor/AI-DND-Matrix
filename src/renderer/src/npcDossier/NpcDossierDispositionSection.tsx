import { NPC_DOSSIER_DISPOSITION_EMPTY } from './npcDossierCopy'

export function NpcDossierDispositionSection(props: { disposition: string }): JSX.Element {
  const text = props.disposition.trim()
  return (
    <section className="npc-dossier-section">
      <h3>Disposition</h3>
      {text ? (
        <p className="npc-dossier-disposition">{text}</p>
      ) : (
        <p className="character-sheet-empty">{NPC_DOSSIER_DISPOSITION_EMPTY}</p>
      )}
    </section>
  )
}
