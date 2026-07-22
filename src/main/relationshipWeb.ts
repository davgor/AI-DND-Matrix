import type Database from 'better-sqlite3'
import { listPlayerCharacters } from '../db/repositories/characters'
import { getNpcById } from '../db/repositories/npcs'
import {
  listNpcOpinionsByCampaign
} from '../db/repositories/npcOpinions'
import { listPersonMatchCandidates } from './journalIpc'
import {
  deriveRelationshipWebEdges,
  filterKnownNpcSubjects,
  otherPlayerSubjectOptions,
  playerOpinionSubject,
  type OpinionSubjectOption,
  type RelationshipWebDto,
  type RelationshipWebNode
} from '../shared/npcRelationships/types'

export interface ListOpinionSubjectsInput {
  campaignId: string
  characterId: string
  npcId: string
}

export interface GetRelationshipWebInput {
  campaignId: string
  characterId: string
}

export function listOpinionSubjectOptions(
  db: Database.Database,
  input: ListOpinionSubjectsInput
): OpinionSubjectOption[] {
  const holder = getNpcById(db, input.npcId)
  if (!holder || holder.campaignId !== input.campaignId) {
    return []
  }

  const aboutYou: OpinionSubjectOption = {
    subject: playerOpinionSubject(input.characterId),
    label: 'About you'
  }

  const otherPcs = otherPlayerSubjectOptions(
    listPlayerCharacters(db, input.campaignId).map((c) => ({ id: c.id, name: c.name })),
    input.characterId
  )

  const knownNpcs = filterKnownNpcSubjects(
    listPersonMatchCandidates(db, {
      campaignId: input.campaignId,
      characterId: input.characterId
    }),
    input.npcId
  )

  return [aboutYou, ...otherPcs, ...knownNpcs]
}

function buildWebNodes(
  db: Database.Database,
  input: GetRelationshipWebInput
): RelationshipWebNode[] {
  const known = listPersonMatchCandidates(db, input)
  const npcNodes: RelationshipWebNode[] = known.map((c) => ({
    id: c.npcId,
    name: c.name,
    kind: 'npc'
  }))
  const pcNodes: RelationshipWebNode[] = listPlayerCharacters(db, input.campaignId)
    .filter((c) => c.id !== input.characterId)
    .map((c) => ({
      id: c.id,
      name: c.name,
      kind: 'player_character'
    }))
  return [...npcNodes, ...pcNodes]
}

/** Player-facing web: known-candidate nodes + edges from opinion rows with summaries. */
export function getRelationshipWeb(
  db: Database.Database,
  input: GetRelationshipWebInput
): RelationshipWebDto {
  const nodes = buildWebNodes(db, input)
  const knownNpcIds = new Set(
    nodes.filter((n) => n.kind === 'npc').map((n) => n.id)
  )

  const allEdges = deriveRelationshipWebEdges(listNpcOpinionsByCampaign(db, input.campaignId))
  const edges = allEdges.filter((edge) => knownNpcIds.has(edge.fromNpcId))

  return { nodes, edges }
}
