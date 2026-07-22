import type { TurnFailureCategory } from './types'

/** EPIC-136: production copy stays non-technical (089 dev trace remains separate). */
export function turnFailureMessage(category: TurnFailureCategory): string {
  switch (category) {
    case 'schema_error':
      return 'The DM could not finish that action. You can retry if nothing changed, or abort to keep your last save.'
    case 'provider_error':
      return 'The narrative engine did not respond. Check your connection and try again, or abort to keep your last save.'
    case 'validation_error':
      return 'That action cannot be resolved right now. Finish any pending prompts, then try again.'
    case 'internal_error':
      return 'Something went wrong resolving that action. Abort to keep your last save, or retry if nothing changed.'
  }
}
