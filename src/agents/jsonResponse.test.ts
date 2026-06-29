import { describe, expect, it } from 'vitest'
import { tryParseJson } from './jsonResponse'

describe('tryParseJson', () => {
  it('parses plain JSON', () => {
    expect(tryParseJson('{"a":1}')).toEqual({ a: 1 })
  })

  it('strips a ```json ... ``` markdown code fence before parsing', () => {
    const raw = '```json\n{"a":1}\n```'
    expect(tryParseJson(raw)).toEqual({ a: 1 })
  })

  it('strips a plain ``` ... ``` code fence with no language tag', () => {
    const raw = '```\n{"a":1}\n```'
    expect(tryParseJson(raw)).toEqual({ a: 1 })
  })

  it('extracts a JSON object from surrounding prose', () => {
    const raw = 'Here is the campaign seed:\n{"a":1}\nHope that helps.'
    expect(tryParseJson(raw)).toEqual({ a: 1 })
  })

  it('returns undefined for genuinely malformed input', () => {
    expect(tryParseJson('not json at all')).toBeUndefined()
  })
})
