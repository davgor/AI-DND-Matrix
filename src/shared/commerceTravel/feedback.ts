import type { CommerceResolveResult, TravelResolveResult } from './types'

/** Player-visible copy for engine commerce/travel outcomes (epic 135). */
export function formatCommerceFeedback(result: CommerceResolveResult): string {
  if (!result.ok) {
    return result.message
  }
  if (result.op === 'sell') {
    return `Sold ${result.itemName} for ${result.price} gold. Balance: ${result.newBalance}.`
  }
  return `Bought ${result.itemName} for ${result.price} gold. Balance: ${result.newBalance}.`
}

export function formatTravelFeedback(result: TravelResolveResult): string {
  if (!result.ok) {
    return result.message
  }
  const dayWord = result.daysAdvanced === 1 ? 'day' : 'days'
  return `Traveled to ${result.regionName} (${result.daysAdvanced} ${dayWord}).`
}

export function commerceFailMessage(
  code: 'insufficient_funds' | 'unknown_item' | 'not_owned',
  itemNameHint?: string
): string {
  const label = itemNameHint?.trim() || 'that item'
  switch (code) {
    case 'insufficient_funds':
      return `You cannot afford ${label}.`
    case 'unknown_item':
      return `No known item matches "${label}".`
    case 'not_owned':
      return `You do not have ${label} to sell.`
  }
}

export function travelFailMessage(
  code: 'unknown_destination' | 'already_here',
  destinationNameHint?: string
): string {
  const label = destinationNameHint?.trim() || 'that place'
  if (code === 'already_here') {
    return `You are already in ${label}.`
  }
  return `No known destination matches "${label}".`
}
