export function addNullableTokenSum(current: number | null, delta: number | null): number | null {
  if (delta === null) {
    return null
  }
  if (current === null) {
    return delta
  }
  return current + delta
}

export function mergeNullableTokenSums(left: number | null, right: number | null): number | null {
  if (left === null || right === null) {
    return null
  }
  return left + right
}
