import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'
import type Database from 'better-sqlite3'
import type { PortableAssetRow } from '../../shared/campaignPortability'
import { listCharactersByCampaign } from '../repositories/characters'

export type ReadAssetBytes = (absolutePath: string) => Buffer | null

function mimeFromPath(filePath: string): string {
  const ext = extname(filePath).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  return 'application/octet-stream'
}

function extFromPath(filePath: string): string {
  const ext = extname(filePath).toLowerCase()
  return ext || '.bin'
}

interface PushAssetInput {
  assets: PortableAssetRow[]
  kind: PortableAssetRow['kind']
  ownerEntityId: string
  absolutePath: string | null | undefined
  logicalDir: string
  readAssetBytes: ReadAssetBytes
}

function pushAsset(input: PushAssetInput): void {
  if (!input.absolutePath) return
  const bytes = input.readAssetBytes(input.absolutePath)
  if (!bytes) return
  const id = randomUUID()
  input.assets.push({
    id,
    kind: input.kind,
    logicalPath: `${input.logicalDir}/${id}${extFromPath(input.absolutePath)}`,
    ownerEntityId: input.ownerEntityId,
    mimeType: mimeFromPath(input.absolutePath),
    bytes
  })
}

function listNpcFaceTokenPaths(
  db: Database.Database,
  campaignId: string
): Array<{ id: string; faceTokenPath: string | null }> {
  const rows = db
    .prepare('SELECT id, face_token_path FROM npcs WHERE campaign_id = ?')
    .all(campaignId) as Array<{ id: string; face_token_path: string | null }>
  return rows.map((row) => ({ id: row.id, faceTokenPath: row.face_token_path }))
}

export function collectCampaignPackageAssets(
  db: Database.Database,
  campaignId: string,
  readAssetBytes: ReadAssetBytes
): PortableAssetRow[] {
  const assets: PortableAssetRow[] = []
  for (const character of listCharactersByCampaign(db, campaignId)) {
    pushAsset({
      assets,
      kind: 'portrait',
      ownerEntityId: character.id,
      absolutePath: character.portraitPath,
      logicalDir: 'portraits',
      readAssetBytes
    })
    pushAsset({
      assets,
      kind: 'sheet_background',
      ownerEntityId: character.id,
      absolutePath: character.sheetBackgroundPath,
      logicalDir: 'sheet-backgrounds',
      readAssetBytes
    })
  }
  for (const npc of listNpcFaceTokenPaths(db, campaignId)) {
    pushAsset({
      assets,
      kind: 'npc_face_token',
      ownerEntityId: npc.id,
      absolutePath: npc.faceTokenPath,
      logicalDir: 'npc-face-tokens',
      readAssetBytes
    })
  }
  return assets
}
