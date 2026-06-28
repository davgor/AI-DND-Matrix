import { describe, expect, it } from 'vitest'
import { createScriptedProvider } from './mockHarness'

describe('createScriptedProvider', () => {
  it('returns each scripted response in order, including malformed-schema strings', async () => {
    const provider = createScriptedProvider(['not valid json', '{"ok":true}'])

    await expect(provider.generate('first')).resolves.toBe('not valid json')
    await expect(provider.generate('second')).resolves.toBe('{"ok":true}')
    expect(provider.calls).toEqual([{ prompt: 'first', context: undefined }, { prompt: 'second', context: undefined }])
  })

  it('throws a scripted Error when one is queued, then resumes with later responses', async () => {
    const failure = new Error('boom')
    const provider = createScriptedProvider(['first', failure, 'third'])

    await expect(provider.generate('a')).resolves.toBe('first')
    await expect(provider.generate('b')).rejects.toBe(failure)
    await expect(provider.generate('c')).resolves.toBe('third')
  })
})
