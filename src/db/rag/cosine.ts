/** Cosine similarity for L2-normalized vectors (dot product). */
export function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length)
  let dot = 0
  for (let index = 0; index < length; index += 1) {
    dot += a[index]! * b[index]!
  }
  return dot
}
