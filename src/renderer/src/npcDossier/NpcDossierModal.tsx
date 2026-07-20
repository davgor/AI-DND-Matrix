import { useEffect } from 'react'
import type { NpcDossierDto } from '../../../shared/npcDossier/types'
import { ModalPortal } from '../shared/ModalPortal'
import { NpcDossierModalBody } from './NpcDossierModalBody'
import { formatDossierRole } from './npcDossierCopy'
import './npcDossier.css'

export interface NpcDossierModalProps {
  dossier: NpcDossierDto | null
  loading: boolean
  isOpen: boolean
  onClose: () => void
  error?: string | null
}

function DossierHeader(props: {
  name: string
  role: string
  onClose: () => void
}): JSX.Element {
  const titleId = 'npc-dossier-title'
  const roleLabel = formatDossierRole(props.role)
  return (
    <header className="npc-dossier-header">
      <div>
        <p className="eyebrow">Dossier</p>
        <h2 id={titleId}>
          {props.name} ({roleLabel})
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

export function NpcDossierModal(props: NpcDossierModalProps): JSX.Element | null {
  useEffect(() => {
    if (!props.isOpen) {
      return
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        props.onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [props.isOpen, props.onClose])

  if (!props.isOpen) {
    return null
  }

  const headerName = props.dossier?.name ?? 'NPC'
  const headerRole = props.dossier?.role ?? 'unknown'

  return (
    <ModalPortal>
      <div className="npc-dossier-overlay modal-overlay" role="presentation" onClick={props.onClose}>
        <div
          className="npc-dossier-modal modal-panel"
          role="dialog"
          aria-labelledby="npc-dossier-title"
          onClick={(event) => event.stopPropagation()}
        >
          <DossierHeader name={headerName} role={headerRole} onClose={props.onClose} />
          <NpcDossierModalBody dossier={props.dossier} loading={props.loading} error={props.error} />
        </div>
      </div>
    </ModalPortal>
  )
}
