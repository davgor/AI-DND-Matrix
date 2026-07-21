import type { NpcDossierDto } from '../../../shared/npcDossier/types'
import { NpcDossierDispositionSection } from './NpcDossierDispositionSection'
import { NpcDossierFactsSection } from './NpcDossierFactsSection'
import { NpcDossierOpinionSection } from './NpcDossierOpinionSection'
import { NpcDossierPortrait } from './NpcDossierPortrait'
import { NpcDossierTraitsSection } from './NpcDossierTraitsSection'
import { NPC_DOSSIER_LOADING } from './npcDossierCopy'

export interface NpcDossierModalBodyProps {
  dossier: NpcDossierDto | null
  loading: boolean
  error?: string | null
}

function DossierSections(props: { dossier: NpcDossierDto }): JSX.Element {
  return (
    <div className="npc-dossier-sections">
      <div className="npc-dossier-top-row">
        <div className="npc-dossier-top-main">
          {NpcDossierTraitsSection({
            traits: props.dossier.traits,
            canSpeak: props.dossier.canSpeak
          })}
          {NpcDossierFactsSection({ facts: props.dossier.facts })}
        </div>
        <NpcDossierPortrait faceTokenPath={props.dossier.faceTokenPath} />
      </div>
      {NpcDossierOpinionSection({ opinion: props.dossier.opinion })}
      {NpcDossierDispositionSection({ disposition: props.dossier.disposition })}
    </div>
  )
}

export function NpcDossierModalBody(props: NpcDossierModalBodyProps): JSX.Element {
  if (props.loading) {
    return <p className="character-sheet-empty npc-dossier-loading">{NPC_DOSSIER_LOADING}</p>
  }
  if (props.error) {
    return <p className="npc-dossier-error">{props.error}</p>
  }
  if (!props.dossier) {
    return <p className="character-sheet-empty">No dossier available.</p>
  }
  return DossierSections({ dossier: props.dossier })
}
