import { useEffect, useState } from 'react'
import type { NpcDossierDto } from '../../../shared/npcDossier/types'
import { ModalPortal } from '../shared/ModalPortal'
import { RelationshipWebPanel } from '../relationshipWeb/RelationshipWebPanel'
import { NpcDossierModalBody } from './NpcDossierModalBody'
import { formatDossierRole } from './npcDossierCopy'
import { useNpcDossierOpinionSubjects } from './useNpcDossierOpinionSubjects'
import './npcDossier.css'

export interface NpcDossierModalProps {
  dossier: NpcDossierDto | null
  loading: boolean
  isOpen: boolean
  onClose: () => void
  error?: string | null
  campaignId?: string
  characterId?: string
  npcId?: string | null
  onOpenNpcFromWeb?: (npcId: string) => void
}

function DossierHeader(props: {
  name: string
  role: string
  onClose: () => void
}): JSX.Element {
  return (
    <header className="npc-dossier-header">
      <div>
        <p className="eyebrow">Dossier</p>
        <h2 id="npc-dossier-title">
          {props.name} ({formatDossierRole(props.role)})
        </h2>
      </div>
      <button
        type="button"
        className="character-log-book-close"
        aria-label="Close dossier"
        onClick={props.onClose}
      >
        ×
      </button>
    </header>
  )
}

function useDossierEscape(isOpen: boolean, webOpen: boolean, onCloseWeb: () => void, onClose: () => void): void {
  useEffect(() => {
    if (!isOpen) {
      return
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') {
        return
      }
      if (webOpen) {
        onCloseWeb()
        return
      }
      onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose, onCloseWeb, webOpen])
}

function DossierDialog(props: {
  dossier: NpcDossierDto | null
  loading: boolean
  error?: string | null
  campaignId: string
  characterId: string
  npcId: string
  onClose: () => void
  onOpenWeb: () => void
}): JSX.Element {
  const subjectState = useNpcDossierOpinionSubjects({
    campaignId: props.campaignId,
    characterId: props.characterId,
    npcId: props.npcId,
    isOpen: true,
    aboutYouOpinion: props.dossier?.opinion ?? null
  })
  const headerName = props.dossier?.name ?? 'NPC'
  const headerRole = props.dossier?.role ?? 'unknown'

  return (
    <div
      className="npc-dossier-modal modal-panel"
      role="dialog"
      aria-labelledby="npc-dossier-title"
      onClick={(event) => event.stopPropagation()}
    >
      <DossierHeader name={headerName} role={headerRole} onClose={props.onClose} />
      <NpcDossierModalBody
        dossier={props.dossier}
        loading={props.loading}
        error={props.error}
        opinion={subjectState.opinion}
        subjects={subjectState.subjects}
        selectedSubjectKey={subjectState.selectedKey}
        onSelectSubject={subjectState.selectSubject}
        loadingSubject={subjectState.loadingSubject}
        onOpenRelationshipWeb={props.onOpenWeb}
      />
    </div>
  )
}

function DossierOverlay(props: NpcDossierModalProps & { onOpenWeb: () => void }): JSX.Element {
  const hasSubjects = Boolean(props.campaignId && props.characterId && props.npcId)
  return (
    <div className="npc-dossier-overlay modal-overlay" role="presentation" onClick={props.onClose}>
      {hasSubjects ? (
        <DossierDialog
          dossier={props.dossier}
          loading={props.loading}
          error={props.error}
          campaignId={props.campaignId!}
          characterId={props.characterId!}
          npcId={props.npcId!}
          onClose={props.onClose}
          onOpenWeb={props.onOpenWeb}
        />
      ) : (
        <div
          className="npc-dossier-modal modal-panel"
          role="dialog"
          aria-labelledby="npc-dossier-title"
          onClick={(event) => event.stopPropagation()}
        >
          <DossierHeader
            name={props.dossier?.name ?? 'NPC'}
            role={props.dossier?.role ?? 'unknown'}
            onClose={props.onClose}
          />
          <NpcDossierModalBody
            dossier={props.dossier}
            loading={props.loading}
            error={props.error}
          />
        </div>
      )}
    </div>
  )
}

export function NpcDossierModal(props: NpcDossierModalProps): JSX.Element | null {
  const [webOpen, setWebOpen] = useState(false)
  useDossierEscape(props.isOpen, webOpen, () => setWebOpen(false), props.onClose)

  useEffect(() => {
    if (!props.isOpen) {
      setWebOpen(false)
    }
  }, [props.isOpen])

  if (!props.isOpen) {
    return null
  }

  return (
    <ModalPortal>
      <DossierOverlay {...props} onOpenWeb={() => setWebOpen(true)} />
      {webOpen && props.campaignId && props.characterId ? (
        <RelationshipWebPanel
          campaignId={props.campaignId}
          characterId={props.characterId}
          onClose={() => setWebOpen(false)}
          onOpenNpc={(npcId) => {
            setWebOpen(false)
            props.onOpenNpcFromWeb?.(npcId)
          }}
        />
      ) : null}
    </ModalPortal>
  )
}
