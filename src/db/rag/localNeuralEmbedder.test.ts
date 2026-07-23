import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createLocalNeuralEmbedder,
  RAG_LOCAL_IDLE_MS,
  type LocalNeuralEncodeBatch
} from './localNeuralEmbedder'
import { LOCAL_NEURAL_EMBEDDING_DIMENSION } from './types'

function unit384(index: number): number[] {
  const vector = Array.from({ length: LOCAL_NEURAL_EMBEDDING_DIMENSION }, () => 0)
  vector[index % LOCAL_NEURAL_EMBEDDING_DIMENSION] = 1
  return vector
}

describe('createLocalNeuralEmbedder metadata', () => {
  it('returns local_neural metadata and 384-d vectors from injected encode', async () => {
    const encodeBatch: LocalNeuralEncodeBatch = async (texts) =>
      texts.map((_, i) => unit384(i + 1))

    const embedder = createLocalNeuralEmbedder({
      modelPath: '/tmp/rag-model',
      encodeBatch
    })

    expect(embedder.name).toBe('local_neural')
    expect(embedder.dimension).toBe(LOCAL_NEURAL_EMBEDDING_DIMENSION)
    expect(embedder.modelId).toBe('all-MiniLM-L6-v2')

    const [a, b] = await embedder.embed(['keep burned', 'other'])
    expect(a).toHaveLength(384)
    expect(b).toHaveLength(384)
    expect(a?.[1]).toBe(1)
    expect(b?.[2]).toBe(1)
  })

  it('is deterministic for the same text within float tolerance', async () => {
    const encodeBatch: LocalNeuralEncodeBatch = async (texts) =>
      texts.map((text) => {
        const vector = unit384(text.length)
        vector[0] = 0.123456789
        return vector
      })

    const embedder = createLocalNeuralEmbedder({
      modelPath: '/tmp/rag-model',
      encodeBatch
    })

    const [first] = await embedder.embed(['fortress destroyed by fire'])
    const [second] = await embedder.embed(['fortress destroyed by fire'])
    expect(first).toBeDefined()
    expect(second).toBeDefined()
    for (let i = 0; i < LOCAL_NEURAL_EMBEDDING_DIMENSION; i++) {
      expect(Math.abs((first?.[i] ?? 0) - (second?.[i] ?? 0))).toBeLessThan(1e-5)
    }
  })

  it('throws when modelPath is empty and no encodeBatch injected', () => {
    expect(() => createLocalNeuralEmbedder({ modelPath: '  ' })).toThrow(/modelPath/i)
  })
})

describe('createLocalNeuralEmbedder idle unload success', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('unloads after idle timeout and reloads on next embed', async () => {
    let loads = 0
    const encodeBatch: LocalNeuralEncodeBatch = async (texts) => {
      loads += 1
      return texts.map(() => unit384(3))
    }

    const dispose = vi.fn()
    const embedder = createLocalNeuralEmbedder({
      modelPath: '/tmp/rag-model',
      encodeBatch,
      onUnload: dispose,
      idleMs: RAG_LOCAL_IDLE_MS
    })

    await embedder.embed(['one'])
    expect(loads).toBe(1)

    await vi.advanceTimersByTimeAsync(RAG_LOCAL_IDLE_MS)
    expect(dispose).toHaveBeenCalledTimes(1)

    await embedder.embed(['two'])
    expect(loads).toBe(2)
  })
})

describe('createLocalNeuralEmbedder idle unload in-flight', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not unload while an embed is in flight', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const encodeBatch: LocalNeuralEncodeBatch = async (texts) => {
      await gate
      return texts.map(() => unit384(4))
    }
    const dispose = vi.fn()
    const embedder = createLocalNeuralEmbedder({
      modelPath: '/tmp/rag-model',
      encodeBatch,
      onUnload: dispose,
      idleMs: 1_000
    })

    const pending = embedder.embed(['slow'])
    await vi.advanceTimersByTimeAsync(5_000)
    expect(dispose).not.toHaveBeenCalled()
    release()
    await pending
    await vi.advanceTimersByTimeAsync(1_000)
    expect(dispose).toHaveBeenCalledTimes(1)
  })
})
