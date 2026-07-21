import type { NpcDossierDto, NpcDossierFact, NpcDossierOpinion, NpcDossierTraits } from '../../../shared/npcDossier/types'

export function isJsxElement(node: unknown): node is JSX.Element {
  return typeof node === 'object' && node !== null && 'props' in node
}

export function collectText(node: unknown): string[] {
  if (typeof node === 'string') {
    return [node]
  }
  if (!isJsxElement(node)) {
    return []
  }
  const children = node.props.children
  if (children === undefined) {
    return []
  }
  if (Array.isArray(children)) {
    return children.flatMap((child) => collectText(child))
  }
  return collectText(children)
}

function sectionHeading(node: unknown): string | null {
  if (!isJsxElement(node) || node.type !== 'h3') {
    return null
  }
  const heading = collectText(node).join('')
  return heading || null
}

function headingFromSection(node: unknown): string | null {
  if (!isJsxElement(node)) {
    return null
  }
  const className = node.props.className
  if (typeof className !== 'string' || !className.split(/\s+/).includes('npc-dossier-section')) {
    return null
  }
  const children = node.props.children
  if (Array.isArray(children)) {
    for (const child of children) {
      const heading = sectionHeading(child)
      if (heading) {
        return heading
      }
    }
    return null
  }
  return sectionHeading(children)
}

export function collectSectionHeadings(node: unknown): string[] {
  const direct = headingFromSection(node)
  if (direct) {
    return [direct]
  }
  if (!isJsxElement(node)) {
    return []
  }
  const children = node.props.children
  if (children === undefined) {
    return []
  }
  if (Array.isArray(children)) {
    return children.flatMap((child) => collectSectionHeadings(child))
  }
  return collectSectionHeadings(children)
}

function baseTraits(overrides: Partial<NpcDossierTraits> = {}): NpcDossierTraits {
  return {
    temperament: 'friendly',
    raceKey: 'human',
    alignment: 'neutral_good',
    genderKey: 'woman',
    classKey: 'fighter',
    backgroundKey: 'soldier',
    role: 'innkeeper',
    hairColor: null,
    age: null,
    eyeColor: null,
    ...overrides
  }
}

function baseOpinion(overrides: Partial<NpcDossierOpinion> = {}): NpcDossierOpinion {
  return {
    summary: 'Glad the party stopped by.',
    generatedAt: '2026-07-20T12:00:00.000Z',
    stale: false,
    ...overrides
  }
}

export function baseDossier(overrides: Partial<NpcDossierDto> = {}): NpcDossierDto {
  return {
    npcId: 'npc-1',
    name: 'Mira',
    role: 'innkeeper',
    canSpeak: true,
    faceTokenPath: null,
    traits: baseTraits(),
    facts: [],
    opinion: baseOpinion(),
    disposition: 'warm toward the party',
    ...overrides
  }
}

export function dossierFact(overrides: Partial<NpcDossierFact> = {}): NpcDossierFact {
  return {
    id: 'fact-1',
    title: 'Mira',
    content: 'Runs the Oak & Ember.',
    createdAt: '2026-07-02T00:00:00.000Z',
    ...overrides
  }
}
