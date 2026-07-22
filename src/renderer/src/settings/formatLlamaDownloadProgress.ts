/** Formats llama.cpp model download progress for Settings UI. */
export function formatLlamaDownloadProgress(progress: {
  phase: string
  bytesReceived: number
  bytesTotal: number | null
  percent: number | null
  errorMessage?: string
}): string | null {
  if (progress.phase === 'failed' || progress.phase === 'cancelled') {
    return progress.errorMessage ?? null
  }
  if (progress.phase === 'complete') {
    return 'Download complete.'
  }
  if (progress.phase !== 'downloading') {
    return null
  }
  if (progress.percent != null && progress.bytesTotal != null) {
    return `Downloading… ${progress.percent}% (${formatBytes(progress.bytesReceived)} / ${formatBytes(progress.bytesTotal)})`
  }
  if (progress.bytesReceived > 0) {
    return `Downloading… ${formatBytes(progress.bytesReceived)} received`
  }
  return 'Downloading…'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  const mb = bytes / (1024 * 1024)
  if (mb < 1024) {
    return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`
  }
  const gb = mb / 1024
  return `${gb.toFixed(2)} GB`
}
