/**
 * Reliable commerce + travel intents (epic 135).
 * Engine-owned debit/move once intent is accepted; narration is flavor only.
 */

export const COMMERCE_OPS = ['buy', 'sell', 'trade'] as const
export type CommerceOp = (typeof COMMERCE_OPS)[number]

export const COMMERCE_FAIL_CODES = [
  'insufficient_funds',
  'unknown_item',
  'not_owned'
] as const
export type CommerceFailCode = (typeof COMMERCE_FAIL_CODES)[number]

export const TRAVEL_FAIL_CODES = ['unknown_destination', 'already_here'] as const
export type TravelFailCode = (typeof TRAVEL_FAIL_CODES)[number]

/** Explicit non-goals for v1 (no shop surface). */
export const COMMERCE_TRAVEL_NON_GOALS: readonly string[] = [
  'No graphical shop UI',
  'No map picker UI',
  'No bargaining mini-game',
  'No mount/vehicle logistics'
]

export interface CatalogNameRef {
  id: string
  name: string
}

export interface RegionNameRef {
  id: string
  name: string
}

/** Classifier output for a clear commerce intent (one transaction). */
export interface ClassifiedCommerceIntent {
  op: CommerceOp
  itemNameHint: string
  catalogItemId?: string
}

/** Classifier output for a clear travel intent. */
export interface ClassifiedTravelIntent {
  destinationNameHint: string
  estimatedDays: number
  regionId?: string
}

export type CommerceResolveResult =
  | {
      ok: true
      op: CommerceOp
      catalogItemId: string
      itemName: string
      price: number
      newBalance: number
    }
  | {
      ok: false
      code: CommerceFailCode
      message: string
      itemNameHint?: string
    }

export type TravelResolveResult =
  | {
      ok: true
      regionId: string
      regionName: string
      daysAdvanced: number
      inGameDateAfter: number
    }
  | {
      ok: false
      code: TravelFailCode
      message: string
      destinationNameHint?: string
    }

export function isCommerceOp(value: unknown): value is CommerceOp {
  return typeof value === 'string' && (COMMERCE_OPS as readonly string[]).includes(value)
}

export function isCommerceFailCode(value: unknown): value is CommerceFailCode {
  return typeof value === 'string' && (COMMERCE_FAIL_CODES as readonly string[]).includes(value)
}

export function isTravelFailCode(value: unknown): value is TravelFailCode {
  return typeof value === 'string' && (TRAVEL_FAIL_CODES as readonly string[]).includes(value)
}
