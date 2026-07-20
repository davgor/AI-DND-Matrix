import { describe, expect, it } from 'vitest'
import { validateCustomModelId } from './modelCatalogValidation'

describe('validateCustomModelId', () => {
  it('fails on empty custom id', () => {
    expect(validateCustomModelId('', 'openaiModel')).toEqual({
      field: 'openaiModel',
      message: 'Enter a custom model id, or pick a catalog model.'
    })
  })

  it('passes for a non-empty id', () => {
    expect(validateCustomModelId('gpt-custom', 'openaiModel')).toBeNull()
  })
})
