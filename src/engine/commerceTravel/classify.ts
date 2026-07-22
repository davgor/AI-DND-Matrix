import type {
  CatalogNameRef,
  ClassifiedCommerceIntent,
  ClassifiedTravelIntent,
  CommerceOp,
  RegionNameRef
} from '../../shared/commerceTravel/types'

const BUY_PATTERN =
  /\b(?:buy|buys|buying|bought|purchase|purchases|purchasing|purchased|trade\s+for|trades?\s+for|trading\s+for)\b/i
const SELL_PATTERN = /\b(?:sell|sells|selling|sold)\b/i
const TRAVEL_PATTERN =
  /\b(?:travel|travels|traveling|travelling|travelled|traveled|journey|journeys|go\s+to|goes\s+to|head\s+to|heads\s+to|set\s+out\s+for|set\s+off\s+for|make\s+for)\b/i

const TRAVEL_DEST_CAPTURE =
  /\b(?:travel(?:s|ing|ling|led|ed)?|journey(?:s)?|go(?:es)?\s+to|head(?:s)?\s+to|set\s+out\s+for|set\s+off\s+for|make\s+for)\s+(?:to\s+|for\s+|toward(?:s)?\s+)?(.+)$/i

const COMMERCE_ITEM_CAPTURE =
  /\b(?:buy|buys|buying|bought|purchase|purchases|purchasing|purchased|sell|sells|selling|sold|trade\s+for|trades?\s+for|trading\s+for)\s+(?:me\s+)?(?:a|an|the|my|that|this)?\s*(.+)$/i

/** Advice-seeking travel questions are not accepted travel intents. */
const TRAVEL_ADVICE_PATTERN = /\b(?:should|could|would)\s+i\b/i

const DEFAULT_TRAVEL_DAYS = 1

function normalizeHint(raw: string): string {
  return raw
    .replace(/[.!?,"']+$/g, '')
    .replace(/^(?:a|an|the|my|that|this)\s+/i, '')
    .trim()
}

function matchCatalogItem(
  hint: string,
  catalog: readonly CatalogNameRef[]
): CatalogNameRef | undefined {
  const lower = hint.toLowerCase()
  const exact = catalog.find((item) => item.name.toLowerCase() === lower)
  if (exact) {
    return exact
  }
  const contained = catalog
    .filter((item) => lower.includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(lower))
    .sort((a, b) => b.name.length - a.name.length)
  return contained[0]
}

function matchRegion(hint: string, regions: readonly RegionNameRef[]): RegionNameRef | undefined {
  const lower = hint.toLowerCase()
  const exact = regions.find((region) => region.name.toLowerCase() === lower)
  if (exact) {
    return exact
  }
  return regions.find((region) => lower.includes(region.name.toLowerCase()))
}

function commerceOpFromInput(playerInput: string): CommerceOp | null {
  if (SELL_PATTERN.test(playerInput) && !BUY_PATTERN.test(playerInput)) {
    return 'sell'
  }
  if (/\btrad(?:e|es|ing)\s+for\b/i.test(playerInput)) {
    return 'trade'
  }
  if (BUY_PATTERN.test(playerInput)) {
    return 'buy'
  }
  return null
}

/** Pure classifier: clear buy/sell/trade against catalog names, or null. */
export function classifyCommerceIntent(
  playerInput: string,
  catalog: readonly CatalogNameRef[]
): ClassifiedCommerceIntent | null {
  const op = commerceOpFromInput(playerInput)
  if (!op) {
    return null
  }
  const captured = COMMERCE_ITEM_CAPTURE.exec(playerInput.trim())
  const hint = normalizeHint(captured?.[1] ?? '')
  if (!hint) {
    return null
  }
  const matched = matchCatalogItem(hint, catalog)
  return {
    op,
    itemNameHint: matched?.name ?? hint,
    catalogItemId: matched?.id
  }
}

/** Pure classifier: clear travel to a named place, or null. */
export function classifyTravelIntent(
  playerInput: string,
  regions: readonly RegionNameRef[]
): ClassifiedTravelIntent | null {
  if (!TRAVEL_PATTERN.test(playerInput) || TRAVEL_ADVICE_PATTERN.test(playerInput)) {
    return null
  }
  const captured = TRAVEL_DEST_CAPTURE.exec(playerInput.trim())
  const hint = normalizeHint(captured?.[1] ?? '')
  if (!hint) {
    return null
  }
  const matched = matchRegion(hint, regions)
  return {
    destinationNameHint: matched?.name ?? hint,
    estimatedDays: DEFAULT_TRAVEL_DAYS,
    regionId: matched?.id
  }
}
