export const MIN_TRAVEL_DAYS = 0
export const MAX_TRAVEL_DAYS = 30

export function resolveTravel(estimatedDays: number): number {
  return Math.min(MAX_TRAVEL_DAYS, Math.max(MIN_TRAVEL_DAYS, estimatedDays))
}
