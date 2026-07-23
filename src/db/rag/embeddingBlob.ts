export function packEmbedding(embedding: number[], expectedDimension?: number): Buffer {
  const expected = expectedDimension ?? embedding.length
  if (embedding.length !== expected) {
    throw new Error(`Expected embedding dimension ${expected}, got ${embedding.length}`)
  }
  if (embedding.length === 0) {
    throw new Error('Embedding dimension must be greater than 0')
  }
  return Buffer.from(new Float32Array(embedding).buffer)
}

export function unpackEmbedding(blob: Buffer): number[] {
  const byteLength = blob.byteLength
  if (byteLength % Float32Array.BYTES_PER_ELEMENT !== 0) {
    throw new Error(`Embedding blob length ${byteLength} is not a multiple of 4`)
  }
  const float32 = new Float32Array(
    blob.buffer,
    blob.byteOffset,
    byteLength / Float32Array.BYTES_PER_ELEMENT
  )
  return Array.from(float32)
}
