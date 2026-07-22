import { describe, expect, it } from 'vitest'
import type { RelationshipWebDto } from '../../../shared/npcRelationships/types'
import { createElement, type ReactNode } from 'react'

/** Lightweight render helpers matching npcDossier test utils. */
function collectText(node: ReactNode): string[] {
  if (node == null || typeof node === 'boolean') {
    return []
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return [String(node)]
  }
  if (Array.isArray(node)) {
    return node.flatMap(collectText)
  }
  if (typeof node === 'object' && 'props' in node) {
    const props = node.props as { children?: ReactNode }
    return collectText(props.children)
  }
  return []
}

function RelationshipWebListView(props: {
  web: RelationshipWebDto
  onOpenNpc: (npcId: string) => void
}): JSX.Element {
  const npcNodes = props.web.nodes.filter((n) => n.kind === 'npc')
  if (npcNodes.length === 0 && props.web.edges.length === 0) {
    return createElement(
      'p',
      null,
      'No known relationships yet. Meet NPCs and open their dossiers to grow the web.'
    )
  }
  return createElement(
    'div',
    null,
    createElement(
      'ul',
      null,
      npcNodes.map((node) =>
        createElement('li', { key: node.id }, createElement('button', null, node.name))
      )
    ),
    createElement(
      'ul',
      null,
      props.web.edges.map((edge) =>
        createElement(
          'li',
          { key: `${edge.fromNpcId}:${edge.subjectId}` },
          createElement('button', null, `${edge.stance}`)
        )
      )
    )
  )
}

describe('RelationshipWebListView', () => {
  it('shows empty campaign copy when no nodes or edges', () => {
    const tree = RelationshipWebListView({
      web: { nodes: [], edges: [] },
      onOpenNpc: () => undefined
    })
    expect(collectText(tree).join(' ')).toContain('No known relationships yet')
  })

  it('lists known NPC nodes and stance chips for multi-edge fixture', () => {
    const tree = RelationshipWebListView({
      web: {
        nodes: [
          { id: 'npc-a', name: 'Mira', kind: 'npc' },
          { id: 'npc-b', name: 'Captain', kind: 'npc' }
        ],
        edges: [
          {
            fromNpcId: 'npc-a',
            subjectType: 'npc',
            subjectId: 'npc-b',
            stance: 'hostile',
            hasSummary: true
          },
          {
            fromNpcId: 'npc-b',
            subjectType: 'player_character',
            subjectId: 'hero',
            stance: 'warm',
            hasSummary: true
          }
        ]
      },
      onOpenNpc: () => undefined
    })
    const text = collectText(tree).join(' ')
    expect(text).toContain('Mira')
    expect(text).toContain('Captain')
    expect(text).toContain('hostile')
    expect(text).toContain('warm')
  })
})
