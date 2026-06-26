import { describe, expect, it } from 'vitest'
import { creditCurrency, debitCurrency } from './currency'

describe('creditCurrency', () => {
  it('adds to the current balance', () => {
    expect(creditCurrency({ currency: 100 }, 50)).toEqual({ success: true, state: { currency: 150 } })
  })
})

describe('debitCurrency', () => {
  it('subtracts a valid amount from the current balance', () => {
    expect(debitCurrency({ currency: 100 }, 50)).toEqual({ success: true, state: { currency: 50 } })
  })

  it('rejects an over-debit instead of clamping to zero', () => {
    expect(debitCurrency({ currency: 30 }, 50)).toEqual({ success: false, reason: 'insufficient funds' })
  })
})
