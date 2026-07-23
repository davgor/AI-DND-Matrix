/**
 * Local neural MiniLM embedder (epic 154.4).
 * Portable — no Electron/userData imports. Main injects modelPath.
 */

import {
  LOCAL_NEURAL_EMBEDDING_DIMENSION,
  type Embedder
} from './types'

export const RAG_LOCAL_IDLE_MS = 300_000

export const LOCAL_NEURAL_MODEL_ID = 'all-MiniLM-L6-v2'

export const LOCAL_NEURAL_HUB_MODEL_ID = 'onnx-community/all-MiniLM-L6-v2-ONNX'

/** Float equality tolerance for same-text determinism checks. */
export const LOCAL_NEURAL_FLOAT_TOLERANCE = 1e-5

export type LocalNeuralEncodeBatch = (texts: string[]) => Promise<number[][]>

export interface LocalNeuralEmbedderOptions {
  modelPath: string
  hubModelId?: string
  modelId?: string
  idleMs?: number
  /** Inject for CI; default loads Transformers.js from modelPath cache. */
  encodeBatch?: LocalNeuralEncodeBatch
  onUnload?: () => void
  setIdleTimer?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>
  clearIdleTimer?: (id: ReturnType<typeof setTimeout>) => void
}

interface NeuralRuntime {
  encodeBatch: LocalNeuralEncodeBatch
  dispose: () => void
}

type PipelineLike = (
  texts: string[],
  options: { pooling: string; normalize: boolean }
) => Promise<{ tolist: () => number[][] } | number[][]>

async function loadTransformersPipeline(
  modelPath: string,
  hubModelId: string
): Promise<NeuralRuntime> {
  const transformers = (await import('@huggingface/transformers')) as unknown as {
    env: { cacheDir?: string }
    pipeline: (
      task: string,
      model: string,
      options: { cache_dir: string; local_files_only: boolean }
    ) => Promise<PipelineLike>
  }
  transformers.env.cacheDir = modelPath
  const extractor = (await transformers.pipeline('feature-extraction', hubModelId, {
    cache_dir: modelPath,
    local_files_only: true
  })) as unknown as PipelineLike

  return {
    encodeBatch: async (texts) => {
      const output = await extractor(texts, { pooling: 'mean', normalize: true })
      return vectorsFromPipelineOutput(output, texts.length)
    },
    dispose: () => {
      /* Transformers.js pipelines drop via GC. */
    }
  }
}

function vectorsFromPipelineOutput(
  output: { tolist: () => number[][] } | number[][],
  expected: number
): number[][] {
  const rows = typeof (output as { tolist?: () => number[][] }).tolist === 'function'
    ? (output as { tolist: () => number[][] }).tolist()
    : (output as number[][])
  if (rows.length !== expected) {
    throw new Error(`Neural embedder expected ${expected} vectors, got ${rows.length}`)
  }
  return rows.map((row) => assertDim384(row))
}

function assertDim384(row: number[]): number[] {
  if (row.length !== LOCAL_NEURAL_EMBEDDING_DIMENSION) {
    throw new Error(
      `Neural embedder dimension mismatch: expected ${LOCAL_NEURAL_EMBEDDING_DIMENSION}, got ${row.length}`
    )
  }
  return row
}

function requireModelPath(modelPath: string): string {
  const trimmed = modelPath.trim()
  if (!trimmed) {
    throw new Error('createLocalNeuralEmbedder requires a non-empty modelPath')
  }
  return trimmed
}

interface IdleController {
  clearIdle: () => void
  scheduleIdleUnload: () => void
  bumpInFlight: (delta: number) => void
  ensureRuntime: () => Promise<NeuralRuntime>
}

function createRuntimeLoader(input: {
  options: LocalNeuralEmbedderOptions
  modelPath: string
  hubModelId: string
}): {
  ensureRuntime: () => Promise<NeuralRuntime>
  clearRuntime: () => void
  isLoaded: () => boolean
} {
  let runtime: NeuralRuntime | null = null
  let loaded = false

  return {
    isLoaded: () => loaded,
    clearRuntime: () => {
      runtime?.dispose()
      runtime = null
      loaded = false
    },
    async ensureRuntime(): Promise<NeuralRuntime> {
      if (runtime) {
        return runtime
      }
      if (input.options.encodeBatch) {
        runtime = { encodeBatch: input.options.encodeBatch, dispose: () => undefined }
        loaded = true
        return runtime
      }
      runtime = await loadTransformersPipeline(input.modelPath, input.hubModelId)
      loaded = true
      return runtime
    }
  }
}

function createIdleController(input: {
  options: LocalNeuralEmbedderOptions
  modelPath: string
  hubModelId: string
  idleMs: number
}): IdleController {
  const setIdleTimer = input.options.setIdleTimer ?? setTimeout
  const clearIdleTimer = input.options.clearIdleTimer ?? clearTimeout
  const loader = createRuntimeLoader(input)
  let inFlight = 0
  let idleTimer: ReturnType<typeof setTimeout> | null = null

  function clearIdle(): void {
    if (idleTimer != null) {
      clearIdleTimer(idleTimer)
      idleTimer = null
    }
  }

  function scheduleIdleUnload(): void {
    clearIdle()
    idleTimer = setIdleTimer(() => {
      if (inFlight > 0 || !loader.isLoaded()) {
        return
      }
      loader.clearRuntime()
      input.options.onUnload?.()
    }, input.idleMs)
  }

  return {
    clearIdle,
    scheduleIdleUnload,
    bumpInFlight: (delta) => {
      inFlight += delta
      if (inFlight === 0 && loader.isLoaded()) {
        scheduleIdleUnload()
      }
    },
    ensureRuntime: () => loader.ensureRuntime()
  }
}

export function createLocalNeuralEmbedder(options: LocalNeuralEmbedderOptions): Embedder {
  const modelPath = options.encodeBatch
    ? options.modelPath.trim() || '.'
    : requireModelPath(options.modelPath)
  const hubModelId = options.hubModelId ?? LOCAL_NEURAL_HUB_MODEL_ID
  const modelId = options.modelId ?? LOCAL_NEURAL_MODEL_ID
  const idle = createIdleController({
    options,
    modelPath,
    hubModelId,
    idleMs: options.idleMs ?? RAG_LOCAL_IDLE_MS
  })

  return {
    name: 'local_neural',
    dimension: LOCAL_NEURAL_EMBEDDING_DIMENSION,
    modelId,
    async embed(texts: string[]): Promise<number[][]> {
      idle.clearIdle()
      idle.bumpInFlight(1)
      try {
        const active = await idle.ensureRuntime()
        return (await active.encodeBatch(texts)).map(assertDim384)
      } finally {
        idle.bumpInFlight(-1)
      }
    }
  }
}
