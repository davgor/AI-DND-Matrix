import type { IntentInterpretation, NarrationContext, CheckOutcome } from './dm'
import type { Provider } from './providers/types'
import type { TurnRoutingPlan } from '../shared/turnRouting/types'
import { interpretIntentAndRoute } from './intentAndRoute'

export interface TurnReviewContext extends NarrationContext {
  intent: IntentInterpretation
  checkOutcome?: CheckOutcome
}

/**
 * @deprecated 040.2 merged intent interpretation and turn routing into a
 * single LLM call — production (turnIpc) uses interpretIntentAndRoute
 * directly. This redirect exists only so existing tests can migrate cleanly;
 * the provider must return the merged {"intent":…,"routingPlan":…} schema.
 * The context's pre-resolved `intent`/`checkOutcome` are ignored: routing now
 * happens before the roll, and check turns are guaranteed a dmNarration beat
 * post-parse instead.
 */
export async function reviewTurn(
  provider: Provider,
  context: TurnReviewContext
): Promise<TurnRoutingPlan> {
  const { routingPlan } = await interpretIntentAndRoute(provider, context)
  return routingPlan
}
