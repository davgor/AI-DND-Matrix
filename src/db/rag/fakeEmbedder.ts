import { embedHashedText } from './localEmbedder'
import { EMBEDDING_DIMENSION, type Embedder } from './types'

export interface FakeEmbedder extends Embedder {
  readonly callCount: number
}

export interface FakeEmbedderOptions {
  fixtures?: Record<string, number[]>
}

function resolveFixtureVector(
  text: string,
  fixtures: Record<string, number[]> | undefined
): number[] | undefined {
  const fixture = fixtures?.[text]
  if (!fixture) {
    return undefined
  }
  if (fixture.length !== EMBEDDING_DIMENSION) {
    throw new Error(`Fixture for "${text}" must have length ${EMBEDDING_DIMENSION}`)
  }
  return [...fixture]
}

export function createFakeEmbedder(options: FakeEmbedderOptions = {}): FakeEmbedder {
  let callCount = 0
  const dimension = EMBEDDING_DIMENSION

  return {
    name: 'fake',
    dimension,
    modelId: 'fake-v1',
    get callCount() {
      return callCount
    },
    async embed(texts: string[]): Promise<number[][]> {
      callCount += 1
      return texts.map((text) => resolveFixtureVector(text, options.fixtures) ?? embedHashedText(text))
    }
  }
}
