import { describe, expect, it, vi } from 'vitest'
import {
  buildNpmCiEnv,
  DEFAULT_ATTEMPTS,
  DEFAULT_DELAY_MS,
  runNpmCiWithRetry
} from './npm-ci-with-retry.mjs'

describe('buildNpmCiEnv', () => {
  it('sets ELECTRON_SKIP_BINARY_DOWNLOAD so postinstall cannot flake on Chromium download', () => {
    expect(buildNpmCiEnv({ PATH: '/usr/bin' })).toEqual({
      PATH: '/usr/bin',
      ELECTRON_SKIP_BINARY_DOWNLOAD: '1'
    })
  })

  it('overwrites a caller-provided skip flag to the required value', () => {
    expect(buildNpmCiEnv({ ELECTRON_SKIP_BINARY_DOWNLOAD: '0' }).ELECTRON_SKIP_BINARY_DOWNLOAD).toBe(
      '1'
    )
  })
})

describe('runNpmCiWithRetry', () => {
  it('returns on first successful npm ci without cleaning or sleeping', async () => {
    const runCommand = vi.fn(async () => ({ code: 0 }))
    const rmNodeModules = vi.fn()
    const sleep = vi.fn(async () => {})
    const log = vi.fn()

    await expect(
      runNpmCiWithRetry({ runCommand, rmNodeModules, sleep, log })
    ).resolves.toEqual({ attempts: 1 })

    expect(runCommand).toHaveBeenCalledTimes(1)
    expect(rmNodeModules).not.toHaveBeenCalled()
    expect(sleep).not.toHaveBeenCalled()
  })

  it('retries after failure, cleans node_modules, then succeeds', async () => {
    const runCommand = vi
      .fn()
      .mockResolvedValueOnce({ code: 1 })
      .mockResolvedValueOnce({ code: 0 })
    const rmNodeModules = vi.fn()
    const sleep = vi.fn(async () => {})
    const log = vi.fn()

    await expect(
      runNpmCiWithRetry({
        runCommand,
        rmNodeModules,
        sleep,
        log,
        attempts: 3,
        delayMs: 50
      })
    ).resolves.toEqual({ attempts: 2 })

    expect(runCommand).toHaveBeenCalledTimes(2)
    expect(rmNodeModules).toHaveBeenCalledTimes(1)
    expect(sleep).toHaveBeenCalledWith(50)
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/attempt 1\/3 failed/i))
  })

  it('throws after exhausting attempts', async () => {
    const runCommand = vi.fn(async () => ({ code: 1 }))
    const rmNodeModules = vi.fn()
    const sleep = vi.fn(async () => {})

    await expect(
      runNpmCiWithRetry({
        runCommand,
        rmNodeModules,
        sleep,
        log: () => {},
        attempts: 2,
        delayMs: 1
      })
    ).rejects.toThrow(/npm ci failed after 2 attempts/)

    expect(runCommand).toHaveBeenCalledTimes(2)
    expect(rmNodeModules).toHaveBeenCalledTimes(1)
    expect(sleep).toHaveBeenCalledTimes(1)
  })

  it('exports stable default attempt/delay constants for CI wiring', () => {
    expect(DEFAULT_ATTEMPTS).toBe(3)
    expect(DEFAULT_DELAY_MS).toBe(10_000)
  })
})
