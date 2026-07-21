import type { NpcDossierOpinion } from '../../../shared/npcDossier/types'
import { NPC_DOSSIER_OPINION_EMPTY, NPC_DOSSIER_OPINION_STALE_NOTE } from './npcDossierCopy'

export function NpcDossierOpinionSection(props: { opinion: NpcDossierOpinion }): JSX.Element {
  const summary = props.opinion.summary?.trim()
  return (
    <section className="npc-dossier-section">
      <h3>Opinion (DM)</h3>
      {summary ? (
        <>
          <p className="npc-dossier-opinion-summary">{summary}</p>
          {props.opinion.stale ? (
            <p className="npc-dossier-opinion-stale">{NPC_DOSSIER_OPINION_STALE_NOTE}</p>
          ) : null}
        </>
      ) : (
        <p className="character-sheet-empty">{NPC_DOSSIER_OPINION_EMPTY}</p>
      )}
    </section>
  )
}
