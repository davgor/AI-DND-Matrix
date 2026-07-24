import { describe, expect, it } from 'vitest'
import {
  LLAMACPP_USERDATA_DIR_NAME,
  LlamaCppAssetError,
  catalogModelFileName,
  llamacppModelsDir,
  llamacppRoot,
  llamacppRuntimeDir,
  resolveLlamaCppAssetPaths
} from './paths'

const USER_DATA = 'C:\\Users\\test\\AppData\\Roaming\\AI-TTRPG'

describe('llamacpp userData layout helpers', () => {
  it('builds the uninstall target root under userData/llamacpp', () => {
    expect(LLAMACPP_USERDATA_DIR_NAME).toBe('llamacpp')
    expect(llamacppRoot(USER_DATA).replace(/\\/g, '/')).toBe(
      'C:/Users/test/AppData/Roaming/AI-TTRPG/llamacpp'
    )
  })

  it('builds models and runtime directories under userData/llamacpp', () => {
    expect(llamacppModelsDir(USER_DATA).replace(/\\/g, '/')).toBe(
      'C:/Users/test/AppData/Roaming/AI-TTRPG/llamacpp/models'
    )
    expect(llamacppRuntimeDir(USER_DATA).replace(/\\/g, '/')).toBe(
      'C:/Users/test/AppData/Roaming/AI-TTRPG/llamacpp/runtime'
    )
  })

  it('names catalog model files from catalog id', () => {
    expect(catalogModelFileName('qwen25-7b-instruct-q4-k-m')).toBe(
      'qwen25-7b-instruct-q4-k-m.gguf'
    )
  })
})

describe('resolveLlamaCppAssetPaths manual', () => {
  it('prefers absolute BYO server and model paths when they exist', () => {
    const resolved = resolveLlamaCppAssetPaths({
      userDataRoot: USER_DATA,
      serverPath: 'D:\\tools\\llama-server.exe',
      modelPath: 'D:\\models\\custom.gguf',
      catalogModelId: '',
      downloadState: 'idle',
      pathExists: () => true
    })

    expect(resolved).toEqual({
      serverPath: 'D:\\tools\\llama-server.exe',
      modelPath: 'D:\\models\\custom.gguf',
      source: 'manual'
    })
  })
})

describe('resolveLlamaCppAssetPaths catalog', () => {
  it('resolves ready catalog download under userData models dir', () => {
    const resolved = resolveLlamaCppAssetPaths({
      userDataRoot: USER_DATA,
      serverPath: 'D:\\tools\\llama-server.exe',
      modelPath: '',
      catalogModelId: 'qwen25-7b-instruct-q4-k-m',
      downloadState: 'ready',
      pathExists: (candidate) =>
        candidate.endsWith('llama-server.exe') || candidate.endsWith('.gguf')
    })

    expect(resolved.source).toBe('catalog')
    expect(resolved.modelPath.replace(/\\/g, '/')).toContain(
      'llamacpp/models/qwen25-7b-instruct-q4-k-m.gguf'
    )
    expect(resolved.serverPath).toBe('D:\\tools\\llama-server.exe')
  })
})

describe('resolveLlamaCppAssetPaths acquired runtime', () => {
  it('resolves acquired runtime under userData when server path empty', () => {
    const runtimeName = process.platform === 'win32' ? 'llama-server.exe' : 'llama-server'
    const resolved = resolveLlamaCppAssetPaths({
      userDataRoot: USER_DATA,
      serverPath: '',
      modelPath: 'D:\\models\\custom.gguf',
      catalogModelId: '',
      downloadState: 'idle',
      pathExists: (candidate) =>
        candidate.endsWith(runtimeName) || candidate.endsWith('custom.gguf')
    })

    expect(resolved.source).toBe('manual')
    expect(resolved.serverPath.replace(/\\/g, '/')).toContain(`llamacpp/runtime/${runtimeName}`)
  })
})

describe('resolveLlamaCppAssetPaths incomplete download', () => {
  it('throws typed error with recovery hint when catalog download is not ready', () => {
    expect(() =>
      resolveLlamaCppAssetPaths({
        userDataRoot: USER_DATA,
        serverPath: 'D:\\tools\\llama-server.exe',
        modelPath: '',
        catalogModelId: 'qwen25-7b-instruct-q4-k-m',
        downloadState: 'downloading',
        pathExists: () => true
      })
    ).toThrow(LlamaCppAssetError)

    try {
      resolveLlamaCppAssetPaths({
        userDataRoot: USER_DATA,
        serverPath: 'D:\\tools\\llama-server.exe',
        modelPath: '',
        catalogModelId: 'qwen25-7b-instruct-q4-k-m',
        downloadState: 'failed',
        pathExists: () => true
      })
    } catch (error) {
      expect(error).toBeInstanceOf(LlamaCppAssetError)
      expect((error as LlamaCppAssetError).recoveryHint).toMatch(/Settings/i)
      expect((error as LlamaCppAssetError).category).toBe('incomplete_download')
    }
  })
})

describe('resolveLlamaCppAssetPaths missing model', () => {
  it('throws when resolved model file is missing on disk', () => {
    expect(() =>
      resolveLlamaCppAssetPaths({
        userDataRoot: USER_DATA,
        serverPath: 'D:\\tools\\llama-server.exe',
        modelPath: '',
        catalogModelId: 'qwen25-7b-instruct-q4-k-m',
        downloadState: 'ready',
        pathExists: (candidate) => candidate.endsWith('llama-server.exe')
      })
    ).toThrow(LlamaCppAssetError)

    try {
      resolveLlamaCppAssetPaths({
        userDataRoot: USER_DATA,
        serverPath: 'D:\\tools\\llama-server.exe',
        modelPath: '',
        catalogModelId: 'qwen25-7b-instruct-q4-k-m',
        downloadState: 'ready',
        pathExists: (candidate) => candidate.endsWith('llama-server.exe')
      })
    } catch (error) {
      expect((error as LlamaCppAssetError).category).toBe('missing_model')
      expect((error as LlamaCppAssetError).recoveryHint).toMatch(/download/i)
    }
  })
})
