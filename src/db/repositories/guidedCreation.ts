import type Database from 'better-sqlite3'
import type {
  CharacterGuidedCreationFields,
  GuidedCreationPhase,
  IdentityFoundation,
  IdentityFoundationsStatus
} from '../../shared/guidedCreation/types'
import { IDENTITY_FOUNDATIONS } from '../../shared/guidedCreation/types'
import { getCharacterById } from './characters'

interface GuidedCharacterRow {
  identity_who: string | null
  identity_why: string | null
  identity_where: string | null
  identity_what: string | null
  opening_scene: string | null
  guided_creation_phase: GuidedCreationPhase
}

export function readGuidedCreationFields(
  db: Database.Database,
  characterId: string
): CharacterGuidedCreationFields | undefined {
  const row = db
    .prepare(
      `SELECT identity_who, identity_why, identity_where, identity_what,
              opening_scene, guided_creation_phase
       FROM characters WHERE id = ?`
    )
    .get(characterId) as GuidedCharacterRow | undefined
  if (!row) {
    return undefined
  }
  return {
    identityWho: row.identity_who,
    identityWhy: row.identity_why,
    identityWhere: row.identity_where,
    identityWhat: row.identity_what,
    openingScene: row.opening_scene,
    guidedCreationPhase: row.guided_creation_phase
  }
}

function foundationStatus(summary: string | null | undefined): { complete: boolean; summary?: string } {
  return summary ? { complete: true, summary } : { complete: false }
}

export function readIdentityFoundationsStatus(
  db: Database.Database,
  characterId: string
): IdentityFoundationsStatus {
  const fields = readGuidedCreationFields(db, characterId)
  return {
    who: foundationStatus(fields?.identityWho),
    why: foundationStatus(fields?.identityWhy),
    where: foundationStatus(fields?.identityWhere),
    what: foundationStatus(fields?.identityWhat)
  }
}

export function updateIdentityFoundationSummary(
  db: Database.Database,
  characterId: string,
  foundation: IdentityFoundation,
  summary: string
): void {
  const column = `identity_${foundation}` as const
  db.prepare(`UPDATE characters SET ${column} = ? WHERE id = ?`).run(summary, characterId)
}

export function updateIdentityFoundationSummaries(
  db: Database.Database,
  characterId: string,
  summaries: Partial<Record<IdentityFoundation, string>>
): void {
  for (const foundation of IDENTITY_FOUNDATIONS) {
    const summary = summaries[foundation]
    if (summary) {
      updateIdentityFoundationSummary(db, characterId, foundation, summary)
    }
  }
}

export function setOpeningScene(db: Database.Database, characterId: string, openingScene: string): void {
  db.prepare('UPDATE characters SET opening_scene = ? WHERE id = ?').run(openingScene, characterId)
}

export function setGuidedCreationPhase(
  db: Database.Database,
  characterId: string,
  phase: GuidedCreationPhase
): void {
  db.prepare('UPDATE characters SET guided_creation_phase = ? WHERE id = ?').run(phase, characterId)
}

export function completeIdentityPhase(db: Database.Database, characterId: string): void {
  const character = getCharacterById(db, characterId)
  if (!character) {
    return
  }
  setGuidedCreationPhase(db, characterId, 'opening_scene')
}

export function completeOpeningScenePhase(
  db: Database.Database,
  characterId: string,
  openingScene: string
): void {
  db.transaction(() => {
    setOpeningScene(db, characterId, openingScene)
    setGuidedCreationPhase(db, characterId, 'complete')
  })()
}
