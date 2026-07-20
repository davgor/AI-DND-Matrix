import { inflateSync } from 'node:zlib'

interface PngRgba {
  width: number
  height: number
  rgba: Buffer
}

interface PngHeader {
  width: number
  height: number
  bitDepth: number
  colorType: number
  idat: Buffer[]
}

function readPngChunks(png: Buffer): PngHeader {
  if (png.subarray(0, 8).toString('binary') !== '\x89PNG\r\n\x1a\n') {
    throw new Error('Not a PNG')
  }

  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = -1
  const idat: Buffer[] = []

  let offset = 8
  while (offset + 8 <= png.length) {
    const length = png.readUInt32BE(offset)
    const type = png.subarray(offset + 4, offset + 8).toString('ascii')
    const data = png.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8] ?? 0
      colorType = data[9] ?? -1
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') {
      break
    }
    offset += 12 + length
  }

  return { width, height, bitDepth, colorType, idat }
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

type FilterFn = (raw: number, left: number, up: number, upLeft: number) => number

const FILTERS: Record<number, FilterFn> = {
  0: (raw) => raw,
  1: (raw, left) => (raw + left) & 0xff,
  2: (raw, _left, up) => (raw + up) & 0xff,
  3: (raw, left, up) => (raw + Math.floor((left + up) / 2)) & 0xff,
  4: (raw, left, up, upLeft) => (raw + paethPredictor(left, up, upLeft)) & 0xff
}

function applyFilterRow(args: {
  filter: number
  row: Buffer
  rgba: Buffer
  dest: number
  stride: number
  priorRowStart: number | null
}): void {
  const apply = FILTERS[args.filter]
  if (!apply) throw new Error(`Unsupported PNG filter ${args.filter}`)
  for (let i = 0; i < args.stride; i++) {
    const left = i >= 4 ? args.rgba[args.dest + i - 4]! : 0
    const up = args.priorRowStart === null ? 0 : args.rgba[args.priorRowStart + i]!
    const upLeft =
      args.priorRowStart === null || i < 4 ? 0 : args.rgba[args.priorRowStart + i - 4]!
    args.rgba[args.dest + i] = apply(args.row[i] ?? 0, left, up, upLeft)
  }
}

function decodeInflatedRgba(inflated: Buffer, width: number, height: number): Buffer {
  const stride = width * 4
  const rgba = Buffer.alloc(width * height * 4)
  let src = 0
  for (let y = 0; y < height; y++) {
    const filter = inflated[src++] ?? 0
    const row = inflated.subarray(src, src + stride)
    src += stride
    const dest = y * stride
    applyFilterRow({
      filter,
      row,
      rgba,
      dest,
      stride,
      priorRowStart: y > 0 ? dest - stride : null
    })
  }
  return rgba
}

function decodePngRgba(png: Buffer): PngRgba {
  const header = readPngChunks(png)
  if (header.bitDepth !== 8 || header.colorType !== 6) {
    throw new Error(
      `Expected 8-bit RGBA PNG, got depth=${header.bitDepth} colorType=${header.colorType}`
    )
  }
  const inflated = inflateSync(Buffer.concat(header.idat))
  return {
    width: header.width,
    height: header.height,
    rgba: decodeInflatedRgba(inflated, header.width, header.height)
  }
}

/** True when every sampled outer-corner pixel is fully transparent. */
export function pngCornersAreTransparent(png: Buffer, inset = 1): boolean {
  const { width, height, rgba } = decodePngRgba(png)
  const samples: Array<[number, number]> = [
    [inset, inset],
    [width - 1 - inset, inset],
    [inset, height - 1 - inset],
    [width - 1 - inset, height - 1 - inset]
  ]
  return samples.every(([x, y]) => rgba[(y * width + x) * 4 + 3] === 0)
}
