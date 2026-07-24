import { EMBEDDING_DIMENSION, type Embedder } from './types'

function hashString(input: string): number {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (Math.imul(31, hash) + input.charCodeAt(index)) | 0
  }
  return hash >>> 0
}

function hashToBucket(input: string, dimension: number): number {
  return hashString(input) % dimension
}

function createZeroVector(dimension = EMBEDDING_DIMENSION): number[] {
  return Array.from({ length: dimension }, () => 0)
}

export function l2Normalize(vector: number[]): number[] {
  let sumSquares = 0
  for (const value of vector) {
    sumSquares += value * value
  }
  if (sumSquares === 0) {
    return vector
  }

  const inverseNorm = 1 / Math.sqrt(sumSquares)
  return vector.map((value) => value * inverseNorm)
}

function tokenize(text: string): string[] {
  const normalized = text.toLowerCase()
  const tokens = normalized.match(/[a-z0-9]+/g)
  return tokens ?? []
}

function collectNgrams(tokens: string[]): string[] {
  const ngrams: string[] = [...tokens]
  for (let index = 0; index < tokens.length - 1; index += 1) {
    ngrams.push(`${tokens[index]} ${tokens[index + 1]}`)
  }
  return ngrams
}

function addHashedFeatures(vector: number[], features: string[]): number[] {
  const counts = new Map<number, number>()
  for (const feature of features) {
    const bucket = hashToBucket(feature, vector.length)
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1)
  }

  for (const [bucket, count] of counts) {
    vector[bucket] += Math.sqrt(count)
  }

  return vector
}

export function embedHashedText(text: string): number[] {
  const tokens = tokenize(text)
  const features = collectNgrams(tokens)
  const bag = addHashedFeatures(createZeroVector(), features)
  return l2Normalize(bag)
}

export function createLexicalEmbedder(): Embedder {
  return {
    name: 'lexical',
    dimension: EMBEDDING_DIMENSION,
    modelId: 'hashed-bow-v1',
    async embed(texts: string[]): Promise<number[][]> {
      return texts.map(embedHashedText)
    }
  }
}

/** @deprecated Prefer createLexicalEmbedder — same hashed bag-of-words stand-in. */
export function createLocalEmbedder(): Embedder {
  return createLexicalEmbedder()
}
