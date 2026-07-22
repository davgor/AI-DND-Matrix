import { describe, expect, it } from 'vitest'
import {
  LlamaCppRuntimeError,
  acquireLlamaCppRuntime,
  discoverLlamaCppRuntime
} from './runtimeAcquire'

const USER_DATA = 'C:\\Users\\test\\AppData\\Roaming\\AI-TTRPG'

describe('discoverLlamaCppRuntime', () => {
  it('returns PATH hit when lookup finds a binary', () => {
    const result = discoverLlamaCppRuntime({
      userDataRoot: USER_DATA,
      pathExists: (path) => path.includes('Program Files'),
      lookupOnPath: () => 'C:\\Program Files\\llama\\llama-server.exe'
    })
    expect(result).toEqual({
      presence: 'path',
      serverPath: 'C:\\Program Files\\llama\\llama-server.exe'
    })
  })

  it('returns userData hit for acquired runtime', () => {
    const result = discoverLlamaCppRuntime({
      userDataRoot: USER_DATA,
      pathExists: (path) => path.replace(/\\/g, '/').includes('llamacpp/runtime/'),
      lookupOnPath: () => null
    })
    expect(result.presence).toBe('userData')
    expect(result.serverPath?.replace(/\\/g, '/')).toContain('llamacpp/runtime/')
  })

  it('returns missing when nothing is found', () => {
    expect(
      discoverLlamaCppRuntime({
        userDataRoot: USER_DATA,
        pathExists: () => false,
        lookupOnPath: () => null
      })
    ).toEqual({ presence: 'missing', serverPath: null })
  })
})

describe('acquireLlamaCppRuntime', () => {
  it('downloads, extracts, and installs llama-server into userData', async () => {
    const renames: Array<{ from: string; to: string }> = []
    const installed = await acquireLlamaCppRuntime(
      {
        userDataRoot: USER_DATA,
        downloadUrl: 'https://example.test/runtime.zip'
      },
      {
        fetchBytes: async () => new Uint8Array([1, 2, 3]),
        writeFile: () => undefined,
        mkdir: () => undefined as never,
        rm: () => undefined,
        extractZip: async () => undefined,
        findBinary: () => 'C:\\staging\\llama-server.exe',
        rename: (from, to) => {
          renames.push({ from: String(from), to: String(to) })
        },
        pathExists: (path) => String(path).includes('llama-server')
      }
    )
    expect(installed.replace(/\\/g, '/')).toContain('llamacpp/runtime/')
    expect(renames[0]?.from).toContain('staging')
  })

  it('throws typed error with recovery hint on acquire failure', async () => {
    await expect(
      acquireLlamaCppRuntime(
        { userDataRoot: USER_DATA, downloadUrl: 'https://example.test/runtime.zip' },
        {
          fetchBytes: async () => {
            throw new Error('ECONNRESET')
          },
          mkdir: () => undefined as never,
          rm: () => undefined
        }
      )
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(LlamaCppRuntimeError)
      expect((error as LlamaCppRuntimeError).recoveryHint).toMatch(/Settings/i)
      return true
    })
  })
})
