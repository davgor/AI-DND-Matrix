import type { NpcDossierFact } from '../../../shared/npcDossier/types'
import { FormattedText } from '../shared/FormattedText'
import { NPC_DOSSIER_FACTS_EMPTY } from './npcDossierCopy'

export function NpcDossierFactsSection(props: { facts: NpcDossierFact[] }): JSX.Element {
  return (
    <section className="npc-dossier-section">
      <h3>Facts</h3>
      {props.facts.length === 0 ? (
        <p className="character-sheet-empty">{NPC_DOSSIER_FACTS_EMPTY}</p>
      ) : (
        <ul className="npc-dossier-facts-list">
          {props.facts.map((fact) => (
            <li key={fact.id} className="npc-dossier-fact">
              <strong className="npc-dossier-fact-title">{fact.title}</strong>
              {FormattedText({ as: 'p', text: fact.content, className: 'npc-dossier-fact-content' })}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
