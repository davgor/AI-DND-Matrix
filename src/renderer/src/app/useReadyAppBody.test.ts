import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { attachPlayEntryRefreshDetail } from './useReadyAppBody'

describe('attachPlayEntryRefreshDetail', () => {
  it('requires a refreshDetail function for enter-play wiring', () => {
    const refreshDetail = async (): Promise<void> => {}
    const wired = attachPlayEntryRefreshDetail(
      {
        detail: null,
        stage: 'guidedOpeningScene' as const,
        setStage: () => {},
        activeCharacterId: null,
        setActiveCharacterId: () => {}
      },
      refreshDetail
    )
    expect(wired.refreshDetail).toBe(refreshDetail)
  })
})

describe('useReadyAppBody play wiring', () => {
  it('passes refreshDetail into usePlayEntryState', () => {
    const source = readFileSync(join(__dirname, 'useReadyAppBody.ts'), 'utf8')
    expect(source).toMatch(/attachPlayEntryRefreshDetail\(/)
    expect(source).toMatch(/usePlayEntryState\(\s*attachPlayEntryRefreshDetail\(/)
  })
})
