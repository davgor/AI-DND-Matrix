interface ImageLocalCatalogEntry {
  id: string
  label: string
  sizeBytes: number
  vramHintMb: number
  ramHintMb: number
  downloadUrl: string
  filename: string
}

export const IMAGE_LOCAL_REFERENCE_MODEL_ID = 'sd-turbo-onnx'

export const IMAGE_LOCAL_CATALOG: ImageLocalCatalogEntry[] = [
  {
    id: IMAGE_LOCAL_REFERENCE_MODEL_ID,
    label: 'SD Turbo (ONNX, reference)',
    sizeBytes: 680_000_000,
    vramHintMb: 4096,
    ramHintMb: 8192,
    downloadUrl: 'https://example.invalid/image-models/sd-turbo-onnx.zip',
    filename: 'sd-turbo-onnx.zip'
  }
]

function formatImageCatalogSizeLabel(entry: ImageLocalCatalogEntry): string {
  const sizeMb = Math.round(entry.sizeBytes / (1024 * 1024))
  const vramGb = entry.vramHintMb >= 1024 ? `${Math.round(entry.vramHintMb / 1024)} GB` : `${entry.vramHintMb} MB`
  const ramGb = entry.ramHintMb >= 1024 ? `${Math.round(entry.ramHintMb / 1024)} GB` : `${entry.ramHintMb} MB`
  return `~${sizeMb} MB download · ~${vramGb} VRAM · ~${ramGb} RAM`
}

export function imageCatalogDisplayLabel(entry: ImageLocalCatalogEntry): string {
  return `${entry.label} · ${formatImageCatalogSizeLabel(entry)}`
}
