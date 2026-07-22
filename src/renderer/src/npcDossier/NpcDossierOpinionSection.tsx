import type { NpcDossierOpinion } from '../../../shared/npcDossier/types'
import type { OpinionSubjectOption } from '../../../shared/npcRelationships/types'
import {
  NPC_DOSSIER_OPINION_EMPTY,
  NPC_DOSSIER_OPINION_STALE_NOTE,
  NPC_DOSSIER_RELATIONSHIP_WEB
} from './npcDossierCopy'

export interface NpcDossierOpinionSectionProps {
  opinion: NpcDossierOpinion
  subjects: OpinionSubjectOption[]
  selectedKey: string
  onSelectSubject: (key: string) => void
  onOpenRelationshipWeb?: () => void
  loadingSubject?: boolean
}

function subjectKey(option: OpinionSubjectOption): string {
  return `${option.subject.subjectType}:${option.subject.subjectId}`
}

export function NpcDossierOpinionSection(props: NpcDossierOpinionSectionProps): JSX.Element {
  const summary = props.opinion.summary?.trim()
  return (
    <section className="npc-dossier-section">
      <h3>Opinion (DM)</h3>
      {props.subjects.length > 0 ? (
        <label className="npc-dossier-opinion-subject">
          <span className="npc-dossier-opinion-subject-label">About</span>
          <select
            className="npc-dossier-opinion-subject-select"
            value={props.selectedKey}
            onChange={(event) => props.onSelectSubject(event.target.value)}
            aria-label="Opinion subject"
          >
            {props.subjects.map((option) => (
              <option key={subjectKey(option)} value={subjectKey(option)}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {props.loadingSubject ? (
        <p className="character-sheet-empty">Loading opinion…</p>
      ) : summary ? (
        <>
          <p className="npc-dossier-opinion-summary">{summary}</p>
          {props.opinion.stale ? (
            <p className="npc-dossier-opinion-stale">{NPC_DOSSIER_OPINION_STALE_NOTE}</p>
          ) : null}
        </>
      ) : (
        <p className="character-sheet-empty">{NPC_DOSSIER_OPINION_EMPTY}</p>
      )}
      {props.onOpenRelationshipWeb ? (
        <button
          type="button"
          className="npc-dossier-relationship-web-link"
          onClick={props.onOpenRelationshipWeb}
        >
          {NPC_DOSSIER_RELATIONSHIP_WEB}
        </button>
      ) : null}
    </section>
  )
}

export { subjectKey as opinionSubjectOptionKey }
