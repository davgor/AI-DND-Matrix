import { createFakeEmbedder } from './fakeEmbedder'
import { createLocalEmbedder } from './localEmbedder'
import type { Embedder, EmbedderName } from './types'

const EMBEDDERS: Record<EmbedderName, () => Embedder> = {
  local: createLocalEmbedder,
  fake: createFakeEmbedder
}

function isEmbedderName(value: string): value is EmbedderName {
  return value === 'local' || value === 'fake'
}

export function selectEmbedder(name: EmbedderName | string = 'local'): Embedder {
  const resolved = name.trim().toLowerCase()
  if (!isEmbedderName(resolved)) {
    throw new Error(`Unknown embedder "${name}". Supported: local, fake`)
  }
  return EMBEDDERS[resolved]()
}
