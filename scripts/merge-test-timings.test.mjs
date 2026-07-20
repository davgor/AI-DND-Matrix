import { mkdtempSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { extractFileTimings, mergeTestTimings } from './merge-test-timings.mjs'

describe('extractFileTimings', () => {
  it('reads durations from vitest JSON testResults', () => {
    const root = mkdtempSync(join(tmpdir(), 'merge-timings-'))
    mkdirSync(join(root, 'src'), { recursive: true })
    const report = {
      testResults: [
        {
          name: join(root, 'src', 'a.test.ts'),
          startTime: 1000,
          endTime: 1500,
          assertionResults: []
        },
        {
          name: join(root, 'src', 'b.test.ts'),
          duration: 800,
          assertionResults: []
        }
      ]
    }
    expect(extractFileTimings(report, root)).toEqual({
      'src/a.test.ts': 500,
      'src/b.test.ts': 800
    })
  })

  it('sums assertion durations when file duration missing', () => {
    const report = {
      testResults: [
        {
          name: 'src/c.test.ts',
          assertionResults: [{ duration: 10 }, { duration: 25 }]
        }
      ]
    }
    expect(extractFileTimings(report, '/repo')).toEqual({
      'src/c.test.ts': 35
    })
  })
})

describe('mergeTestTimings', () => {
  it('overlays new timings onto previous map', () => {
    expect(
      mergeTestTimings(
        { 'src/a.test.ts': 100, 'src/old.test.ts': 50 },
        [{ 'src/a.test.ts': 200 }, { 'src/b.test.ts': 300 }]
      )
    ).toEqual({
      'src/a.test.ts': 200,
      'src/old.test.ts': 50,
      'src/b.test.ts': 300
    })
  })
})
