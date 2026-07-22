// EPIC-135 — engine commerce/travel resolve beside narration (starvation sibling to 130).
import type Database from 'better-sqlite3'
import type { IntentInterpretation } from '../agents/dm'
import { classifyCommerceIntent, classifyTravelIntent } from '../engine/commerceTravel/classify'
import {
  formatCommerceFeedback,
  formatTravelFeedback,
  travelFailMessage
} from '../shared/commerceTravel/feedback'
import type {
  ClassifiedCommerceIntent,
  ClassifiedTravelIntent,
  CommerceResolveResult,
  TravelResolveResult
} from '../shared/commerceTravel/types'
import type { CommerceSideEffect } from '../db/repositories/itemCommerce'
import { listCatalogItems } from '../db/repositories/items'
import { getRegionById, listRegionsByCampaign } from '../db/repositories/regions'
import { resolveCommerceIntent } from '../db/repositories/commerceTravelResolve'
import { resolveTravel } from '../engine/travel'

export interface CommerceTravelTurnExtras {
  commerceResolve?: CommerceResolveResult
  travelResolve?: TravelResolveResult
  commerceTravelFeedback?: string
}

function alreadyPurchased(
  commerceEffect: CommerceSideEffect | undefined,
  catalogItemId: string
): boolean {
  return (
    commerceEffect?.purchases.some(
      (purchase) => purchase.ok && purchase.catalogItemId === catalogItemId
    ) ?? false
  )
}

function classifyPlayerCommerce(
  db: Database.Database,
  playerInput: string
): ClassifiedCommerceIntent | null {
  const catalog = listCatalogItems(db).map((item) => ({ id: item.id, name: item.name }))
  return classifyCommerceIntent(playerInput, catalog)
}

function classifyPlayerTravel(
  db: Database.Database,
  campaignId: string,
  playerInput: string
): ClassifiedTravelIntent | null {
  const regions = listRegionsByCampaign(db, campaignId).map((region) => ({
    id: region.id,
    name: region.name
  }))
  return classifyTravelIntent(playerInput, regions)
}

/**
 * When the LLM omits actionType travel, overlay a clear classifier match so the
 * existing travel bypass (destination match / generate) still runs.
 * Already-here fails visibly without advancing the clock.
 */
export function overlayTravelIntent(input: {
  db: Database.Database
  campaignId: string
  currentRegionId: string
  playerInput: string
  intent: IntentInterpretation
}): { intent: IntentInterpretation; alreadyHere?: CommerceTravelTurnExtras } {
  if (input.intent.actionType !== undefined) {
    return { intent: input.intent }
  }
  const classified = classifyPlayerTravel(input.db, input.campaignId, input.playerInput)
  // SPEC: overlay only when classifier matches a *known* region — local cues like
  // "head to the well" must not hijack the turn into the travel bypass.
  if (!classified?.regionId) {
    return { intent: input.intent }
  }
  if (classified.regionId === input.currentRegionId) {
    const travelResolve: TravelResolveResult = {
      ok: false,
      code: 'already_here',
      message: travelFailMessage('already_here', classified.destinationNameHint),
      destinationNameHint: classified.destinationNameHint
    }
    return {
      intent: input.intent,
      alreadyHere: {
        travelResolve,
        commerceTravelFeedback: formatTravelFeedback(travelResolve)
      }
    }
  }
  return {
    intent: {
      ...input.intent,
      actionType: 'travel',
      travelDays: classified.estimatedDays,
      travelDestinationName: classified.destinationNameHint,
      checkNeeded: false
    }
  }
}

/** Resolve commerce when classified and narration did not already succeed for that item. */
export function maybeResolveCommerceForTurn(input: {
  db: Database.Database
  characterId: string
  playerInput: string
  commerceEffect?: CommerceSideEffect
}): CommerceTravelTurnExtras {
  const classified = classifyPlayerCommerce(input.db, input.playerInput)
  if (!classified) {
    return {}
  }
  if (classified.catalogItemId && alreadyPurchased(input.commerceEffect, classified.catalogItemId)) {
    return {}
  }
  const commerceResolve = resolveCommerceIntent(input.db, input.characterId, classified)
  return {
    commerceResolve,
    commerceTravelFeedback: formatCommerceFeedback(commerceResolve)
  }
}

/** Player feedback after a successful travel bypass write. */
export function travelSuccessExtras(input: {
  db: Database.Database
  destinationRegionId: string
  estimatedDays: number
  inGameDateAfter?: number
}): CommerceTravelTurnExtras {
  const region = getRegionById(input.db, input.destinationRegionId)
  if (!region) {
    return {}
  }
  const daysAdvanced = resolveTravel(input.estimatedDays)
  const travelResolve: TravelResolveResult = {
    ok: true,
    regionId: region.id,
    regionName: region.name,
    daysAdvanced,
    inGameDateAfter: input.inGameDateAfter ?? 0
  }
  return {
    travelResolve,
    commerceTravelFeedback: formatTravelFeedback(travelResolve)
  }
}

export function travelUnknownDestinationExtras(hint: string): CommerceTravelTurnExtras {
  const travelResolve: TravelResolveResult = {
    ok: false,
    code: 'unknown_destination',
    message: travelFailMessage('unknown_destination', hint),
    destinationNameHint: hint
  }
  return {
    travelResolve,
    commerceTravelFeedback: formatTravelFeedback(travelResolve)
  }
}
