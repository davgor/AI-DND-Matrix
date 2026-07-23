import { describe, expect, it } from 'vitest'
import {
  DEFAULT_WINDOWS_RUNTIME_ZIP_URL,
  LlamaCppRuntimeError,
  acquireLlamaCppRuntime,
  discoverLlamaCppRuntime,
  resolveWindowsRuntimeZipUrl
} from './runtimeAcquire'

const USER_DATA = 'C:\\Users\\test\\AppData\\Roaming\\AI-TTRPG'

describe('resolveWindowsRuntimeZipUrl', () => {
  it('defaults happy-path acquire to the pinned Vulkan GPU build', () => {
    expect(DEFAULT_WINDOWS_RUNTIME_ZIP_URL).toContain('win-vulkan-x64')
    expect(resolveWindowsRuntimeZipUrl('vulkan')).toBe(DEFAULT_WINDOWS_RUNTIME_ZIP_URL)
    expect(resolveWindowsRuntimeZipUrl('vulkan')).toMatch(
      /llama-b\d+-bin-win-vulkan-x64\.zip$/
    )
  })

  it('resolves the CPU backend to the pinned CPU zip', () => {
    expect(resolveWindowsRuntimeZipUrl('cpu')).toContain('win-cpu-x64')
    expect(resolveWindowsRuntimeZipUrl('cpu')).not.toContain('vulkan')
  })
})

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

describe('acquireLlamaCppRuntime full package', () => {
  it('installs the full runtime payload (exe + sibling libs), not only the binary', async () => {
    const copies: Array<{ from: string; to: string }> = []
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
        listDir: () => ['llama-server.exe', 'ggml.dll', 'mtmd.dll'],
        isDirectory: () => false,
        copyFile: (from, to) => {
          copies.push({ from: String(from), to: String(to) })
        },
        pathExists: (path) => {
          const normalized = String(path).replace(/\\/g, '/')
          return (
            normalized.includes('llama-server') ||
            normalized.endsWith('.dll')
          )
        },
        platform: 'win32'
      }
    )
    expect(installed.replace(/\\/g, '/')).toContain('llamacpp/runtime/llama-server.exe')
    expect(copies.some((entry) => entry.from.endsWith('ggml.dll'))).toBe(true)
    expect(copies.some((entry) => entry.to.replace(/\\/g, '/').includes('llamacpp/runtime/'))).toBe(
      true
    )
  })
})

describe('acquireLlamaCppRuntime stop before replace', () => {
  it('stops the managed runtime before clearing or copying locked install files', async () => {
    const events: string[] = []
    await acquireLlamaCppRuntime(
      {
        userDataRoot: USER_DATA,
        downloadUrl: 'https://example.test/runtime.zip'
      },
      {
        fetchBytes: async () => new Uint8Array([1]),
        writeFile: () => undefined,
        mkdir: () => undefined as never,
        rm: () => {
          events.push('rm')
        },
        extractZip: async () => undefined,
        findBinary: () => 'C:\\staging\\llama-server.exe',
        listDir: () => ['llama-server.exe', 'ggml-base.dll'],
        isDirectory: () => false,
        copyFile: () => {
          events.push('copy')
        },
        pathExists: (path) => String(path).includes('llama-server') || String(path).endsWith('.dll'),
        platform: 'win32',
        beforeReplace: async () => {
          events.push('stop')
        }
      }
    )
    expect(events[0]).toBe('stop')
    expect(events.indexOf('stop')).toBeLessThan(events.indexOf('rm'))
    expect(events.indexOf('stop')).toBeLessThan(events.indexOf('copy'))
  })
})

describe('acquireLlamaCppRuntime validation', () => {
  it('rejects a Windows install that has no sibling DLLs', async () => {
    await expect(
      acquireLlamaCppRuntime(
        { userDataRoot: USER_DATA, downloadUrl: 'https://example.test/runtime.zip' },
        {
          fetchBytes: async () => new Uint8Array([1]),
          writeFile: () => undefined,
          mkdir: () => undefined as never,
          rm: () => undefined,
          extractZip: async () => undefined,
          findBinary: () => 'C:\\staging\\llama-server.exe',
          listDir: () => ['llama-server.exe'],
          isDirectory: () => false,
          copyFile: () => undefined,
          pathExists: (path) => String(path).includes('llama-server'),
          platform: 'win32'
        }
      )
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(LlamaCppRuntimeError)
      expect((error as Error).message).toMatch(/DLL/i)
      return true
    })
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
