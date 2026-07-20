import { EMBEDDING_DIMENSION } from './types'

export function packEmbedding(embedding: number[]): Buffer {
  if (embedding.length !== EMBEDDING_DIMENSION) {
    throw new Error(`Expected embedding dimension ${EMBEDDING_DIMENSION}, got ${embedding.length}`)
  }
  return Buffer.from(new Float32Array(embedding).buffer)
}

export function unpackEmbedding(blob: Buffer): number[] {
  const byteLength = blob.byteLength
  if (byteLength % Float32Array.BYTES_PER_ELEMENT !== 0) {
    throw new Error(`Embedding blob length ${byteLength} is not a multiple of 4`)
  }
  const float32 = new Float32Array(blob.buffer, blob.byteOffset, byteLength / Float32Array.BYTES_PER_ELEMENT)
  return Array.from(float32)
}
