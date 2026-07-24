import { describe, expect, it } from 'vitest'
import type { Provider } from './types'
import { withSharedSerialQueue, resetSharedSerialQueueForTests } from './withSerialQueue'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function recordingProvider(events: string[]): Provider {
  return {
    async generate(prompt: string): Promise<string> {
      events.push(`start:${prompt}`)
      await delay(30)
      events.push(`end:${prompt}`)
      return prompt
    }
  }
}

describe('withSharedSerialQueue across instances', () => {
  it('serializes two separately wrapped providers', async () => {
    resetSharedSerialQueueForTests()
    const events: string[] = []
    const makeInner = (label: string): Provider => ({
      async generate(): Promise<string> {
        events.push(`start:${label}`)
        await delay(30)
        events.push(`end:${label}`)
        return label
      }
    })
    await Promise.all([
      withSharedSerialQueue(makeInner('a')).generate('x'),
      withSharedSerialQueue(makeInner('b')).generate('y')
    ])
    expect(events).toEqual(['start:a', 'end:a', 'start:b', 'end:b'])
  })
})

describe('withSharedSerialQueue rejection recovery', () => {
  it('forwards reject without stalling later calls', async () => {
    resetSharedSerialQueueForTests()
    let calls = 0
    const provider: Provider = {
      async generate(): Promise<string> {
        calls += 1
        if (calls === 1) throw new Error('boom')
        return 'ok'
      }
    }
    const serial = withSharedSerialQueue(provider)
    await expect(serial.generate('first')).rejects.toThrow('boom')
    await expect(serial.generate('second')).resolves.toBe('ok')
  })
})

describe('withSharedSerialQueue ordering', () => {
  it('runs overlapping generate() calls in call order', async () => {
    resetSharedSerialQueueForTests()
    const events: string[] = []
    const serial = withSharedSerialQueue(recordingProvider(events))
    const results = await Promise.all([
      serial.generate('a'),
      serial.generate('b'),
      serial.generate('c')
    ])
    expect(results).toEqual(['a', 'b', 'c'])
    expect(events).toEqual([
      'start:a',
      'end:a',
      'start:b',
      'end:b',
      'start:c',
      'end:c'
    ])
  })
})
