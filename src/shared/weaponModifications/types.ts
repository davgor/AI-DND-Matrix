import type { DamageRoll, DamageType } from '../../engine/damage'

export const ITEM_MODIFICATION_KINDS = [
  'addDamageComponent',
  'setDescription',
  'setDisplayName'
] as const
export type ItemModificationKind = (typeof ITEM_MODIFICATION_KINDS)[number]

export interface DamageComponent {
  damageRoll: DamageRoll
  damageType: DamageType
}

export interface AddDamageComponentPayload {
  damageType: DamageType
  diceCount: number
  diceSize: number
}

export interface SetDescriptionPayload {
  description: string
}

export interface SetDisplayNamePayload {
  displayName: string
}

export type ItemModificationPayload =
  | AddDamageComponentPayload
  | SetDescriptionPayload
  | SetDisplayNamePayload

export interface ItemModification {
  id: string
  characterItemId: string
  kind: ItemModificationKind
  payload: ItemModificationPayload
  createdAt: string
}

export interface ItemModificationProposal {
  targetCharacterItemId: string
  kind: ItemModificationKind
  damageType?: DamageType
  diceCount?: number
  diceSize?: number
  displayName?: string
  description?: string
}

export interface WeaponDamageProfile {
  characterItemId: string | null
  catalogName: string
  displayName?: string
  description?: string
  components: DamageComponent[]
}

export interface DamageComponentResult {
  type: DamageType
  rolled: number
  afterResistance: number
}

export interface DamageBreakdown {
  components: DamageComponentResult[]
  total: number
}

export interface ItemModificationAgentResponse {
  narrationText: string
  modification: ItemModificationProposal
}

const DAMAGE_TYPES: DamageType[] = ['physical', 'fire', 'cold', 'poison', 'arcane']

export function isItemModificationKind(value: unknown): value is ItemModificationKind {
  return typeof value === 'string' && (ITEM_MODIFICATION_KINDS as readonly string[]).includes(value)
}

export function isDamageType(value: unknown): value is DamageType {
  return typeof value === 'string' && DAMAGE_TYPES.includes(value as DamageType)
}

function parseAddDamagePayload(raw: Record<string, unknown>): AddDamageComponentPayload | null {
  if (!isDamageType(raw.damageType)) {
    return null
  }
  if (typeof raw.diceCount !== 'number' || typeof raw.diceSize !== 'number') {
    return null
  }
  return {
    damageType: raw.damageType,
    diceCount: Math.floor(raw.diceCount),
    diceSize: Math.floor(raw.diceSize)
  }
}

function parseFlavorPayload(
  kind: ItemModificationKind,
  raw: Record<string, unknown>
): SetDescriptionPayload | SetDisplayNamePayload | null {
  if (kind === 'setDescription' && typeof raw.description === 'string') {
    return { description: raw.description }
  }
  if (kind === 'setDisplayName' && typeof raw.displayName === 'string') {
    return { displayName: raw.displayName }
  }
  return null
}

export function parseItemModificationPayload(
  kind: ItemModificationKind,
  raw: unknown
): ItemModificationPayload | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const body = raw as Record<string, unknown>
  if (kind === 'addDamageComponent') {
    return parseAddDamagePayload(body)
  }
  return parseFlavorPayload(kind, body)
}

export function parseItemModificationProposal(raw: unknown): ItemModificationProposal | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const body = raw as Record<string, unknown>
  if (typeof body.targetCharacterItemId !== 'string' || !isItemModificationKind(body.kind)) {
    return null
  }
  if (body.kind === 'addDamageComponent') {
    return parseAddDamageProposal(body)
  }
  return parseFlavorProposal(body)
}

function parseAddDamageProposal(body: Record<string, unknown>): ItemModificationProposal | null {
  if (!isDamageType(body.damageType)) {
    return null
  }
  if (typeof body.diceCount !== 'number' || typeof body.diceSize !== 'number') {
    return null
  }
  return {
    targetCharacterItemId: body.targetCharacterItemId as string,
    kind: 'addDamageComponent',
    damageType: body.damageType,
    diceCount: Math.floor(body.diceCount),
    diceSize: Math.floor(body.diceSize)
  }
}

function parseFlavorProposal(body: Record<string, unknown>): ItemModificationProposal | null {
  const kind = body.kind as ItemModificationKind
  const proposal: ItemModificationProposal = {
    targetCharacterItemId: body.targetCharacterItemId as string,
    kind
  }
  if (kind === 'setDisplayName' && typeof body.displayName === 'string') {
    proposal.displayName = body.displayName
  }
  if (kind === 'setDescription' && typeof body.description === 'string') {
    proposal.description = body.description
  }
  if (kind === 'setDisplayName' && !proposal.displayName) {
    return null
  }
  if (kind === 'setDescription' && !proposal.description) {
    return null
  }
  return proposal
}

export function parseItemModificationAgentResponse(raw: unknown): ItemModificationAgentResponse | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const body = raw as Record<string, unknown>
  if (typeof body.narrationText !== 'string') {
    return null
  }
  const modification = parseItemModificationProposal(body.modification)
  if (!modification) {
    return null
  }
  return { narrationText: body.narrationText, modification }
}

export function serializeItemModificationPayload(payload: ItemModificationPayload): string {
  return JSON.stringify(payload)
}
