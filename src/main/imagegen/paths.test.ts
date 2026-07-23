import { describe, expect, it } from 'vitest'
import {
  IMAGEGEN_USERDATA_DIR_NAME,
  ImageGenAssetError,
  defaultAcquiredRuntimePath,
  imagegenModelsDir,
  imagegenRoot,
  imagegenRuntimeDir,
  resolveImageGenAssetPaths
} from './paths'

const USER_DATA = 'C:\\Users\\test\\AppData\\Roaming\\AI-TTRPG'

describe('imagegen userData layout helpers', () => {
  it('builds the uninstall target root under userData/imagegen', () => {
    expect(IMAGEGEN_USERDATA_DIR_NAME).toBe('imagegen')
    expect(imagegenRoot(USER_DATA).replace(/\\/g, '/')).toBe(
      'C:/Users/test/AppData/Roaming/AI-TTRPG/imagegen'
    )
  })

  it('builds models and runtime directories under userData/imagegen', () => {
    expect(imagegenModelsDir(USER_DATA).replace(/\\/g, '/')).toBe(
      'C:/Users/test/AppData/Roaming/AI-TTRPG/imagegen/models'
    )
    expect(imagegenRuntimeDir(USER_DATA).replace(/\\/g, '/')).toBe(
      'C:/Users/test/AppData/Roaming/AI-TTRPG/imagegen/runtime'
    )
  })

  it('names acquired sd-server binary under runtime dir', () => {
    const runtimeName = process.platform === 'win32' ? 'sd-server.exe' : 'sd-server'
    expect(defaultAcquiredRuntimePath(USER_DATA).replace(/\\/g, '/')).toContain(
      `imagegen/runtime/${runtimeName}`
    )
  })
})

describe('resolveImageGenAssetPaths catalog', () => {
  it('resolves ready catalog download under userData models dir', () => {
    const resolved = resolveImageGenAssetPaths({
      userDataRoot: USER_DATA,
      serverPath: 'D:\\tools\\sd-server.exe',
      modelPath: '',
      catalogModelId: 'sd-turbo-onnx',
      downloadState: 'ready',
      pathExists: (candidate) =>
        candidate.endsWith('sd-server.exe') || candidate.endsWith('sd-turbo-onnx')
    })

    expect(resolved.source).toBe('catalog')
    expect(resolved.modelPath.replace(/\\/g, '/')).toContain('imagegen/models/sd-turbo-onnx')
    expect(resolved.serverPath).toBe('D:\\tools\\sd-server.exe')
  })
})

describe('resolveImageGenAssetPaths incomplete download', () => {
  it('throws typed error when catalog download is not ready', () => {
    expect(() =>
      resolveImageGenAssetPaths({
        userDataRoot: USER_DATA,
        serverPath: 'D:\\tools\\sd-server.exe',
        modelPath: '',
        catalogModelId: 'sd-turbo-onnx',
        downloadState: 'downloading',
        pathExists: () => true
      })
    ).toThrow(ImageGenAssetError)

    try {
      resolveImageGenAssetPaths({
        userDataRoot: USER_DATA,
        serverPath: 'D:\\tools\\sd-server.exe',
        modelPath: '',
        catalogModelId: 'sd-turbo-onnx',
        downloadState: 'failed',
        pathExists: () => true
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ImageGenAssetError)
      expect((error as ImageGenAssetError).category).toBe('incomplete_download')
      expect((error as ImageGenAssetError).recoveryHint).toMatch(/Settings/i)
    }
  })
})
