export interface CurrencyState {
  currency: number
}

export type CurrencyResult =
  | { success: true; state: CurrencyState }
  | { success: false; reason: string }

export function creditCurrency(state: CurrencyState, amount: number): CurrencyResult {
  return { success: true, state: { currency: state.currency + amount } }
}

export function debitCurrency(state: CurrencyState, amount: number): CurrencyResult {
  if (amount > state.currency) {
    return { success: false, reason: 'insufficient funds' }
  }
  return { success: true, state: { currency: state.currency - amount } }
}
