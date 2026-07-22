import { useEffect, useState } from 'react'
import type { RelationshipWebDto } from '../../../shared/npcRelationships/types'
import { ModalPortal } from '../shared/ModalPortal'
import './relationshipWeb.css'

export interface RelationshipWebPanelProps {
  campaignId: string
  characterId: string
  onClose: () => void
  onOpenNpc: (npcId: string) => void
}

function edgeLabel(
  edge: RelationshipWebDto['edges'][number],
  nodes: RelationshipWebDto['nodes']
): string {
  const from = nodes.find((n) => n.id === edge.fromNpcId)?.name ?? 'Someone'
  const to =
    nodes.find((n) => n.id === edge.subjectId)?.name ??
    (edge.subjectType === 'player_character' ? 'a player' : 'someone')
  return `${from} → ${to} (${edge.stance})`
}

function useRelationshipWeb(
  campaignId: string,
  characterId: string
): { web: RelationshipWebDto | null; loading: boolean; error: string | null } {
  const [web, setWeb] = useState<RelationshipWebDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void window.relationshipWeb
      .get({ campaignId, characterId })
      .then((result) => {
        if (!cancelled) {
          setWeb(result)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load relationship web.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [campaignId, characterId])

  return { web, loading, error }
}

function NodeList(props: {
  nodes: RelationshipWebDto['nodes']
  onOpenNpc: (npcId: string) => void
}): JSX.Element {
  const npcNodes = props.nodes.filter((n) => n.kind === 'npc')
  if (npcNodes.length === 0) {
    return <p className="character-sheet-empty">No known NPCs yet.</p>
  }
  return (
    <ul className="relationship-web-node-list">
      {npcNodes.map((node) => (
        <li key={node.id}>
          <button
            type="button"
            className="relationship-web-node-button"
            onClick={() => props.onOpenNpc(node.id)}
          >
            {node.name}
          </button>
        </li>
      ))}
    </ul>
  )
}

function EdgeList(props: {
  web: RelationshipWebDto
  onOpenNpc: (npcId: string) => void
}): JSX.Element {
  if (props.web.edges.length === 0) {
    return <p className="character-sheet-empty">No opinion edges yet.</p>
  }
  return (
    <ul className="relationship-web-edge-list">
      {props.web.edges.map((edge) => (
        <li key={`${edge.fromNpcId}:${edge.subjectType}:${edge.subjectId}`}>
          <button
            type="button"
            className="relationship-web-edge-button"
            onClick={() => props.onOpenNpc(edge.fromNpcId)}
          >
            {edgeLabel(edge, props.web.nodes)}
          </button>
        </li>
      ))}
    </ul>
  )
}

function RelationshipWebBody(props: {
  web: RelationshipWebDto | null
  loading: boolean
  error: string | null
  onOpenNpc: (npcId: string) => void
}): JSX.Element {
  if (props.loading) {
    return <p className="character-sheet-empty">Loading relationships…</p>
  }
  if (props.error) {
    return <p className="relationship-web-error">{props.error}</p>
  }
  if (!props.web || (props.web.nodes.length === 0 && props.web.edges.length === 0)) {
    return (
      <p className="character-sheet-empty">
        No known relationships yet. Meet NPCs and open their dossiers to grow the web.
      </p>
    )
  }
  return (
    <div className="relationship-web-body">
      <section>
        <h3>Known people</h3>
        <NodeList nodes={props.web.nodes} onOpenNpc={props.onOpenNpc} />
      </section>
      <section>
        <h3>Known opinions</h3>
        <EdgeList web={props.web} onOpenNpc={props.onOpenNpc} />
      </section>
    </div>
  )
}

export function RelationshipWebPanel(props: RelationshipWebPanelProps): JSX.Element {
  const state = useRelationshipWeb(props.campaignId, props.characterId)
  return (
    <ModalPortal>
      <div
        className="relationship-web-overlay modal-overlay"
        role="presentation"
        onClick={props.onClose}
      >
        <div
          className="relationship-web-panel modal-panel"
          role="dialog"
          aria-labelledby="relationship-web-title"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="relationship-web-header">
            <div>
              <p className="eyebrow">Connections</p>
              <h2 id="relationship-web-title">Relationship web</h2>
            </div>
            <button
              type="button"
              className="character-log-book-close"
              aria-label="Close relationship web"
              onClick={props.onClose}
            >
              ×
            </button>
          </header>
          <RelationshipWebBody
            web={state.web}
            loading={state.loading}
            error={state.error}
            onOpenNpc={props.onOpenNpc}
          />
        </div>
      </div>
    </ModalPortal>
  )
}
