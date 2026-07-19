import { existsSync, readdirSync, readFileSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const REQUIRED_META = ['latest.yml']
const OPTIONAL_META = ['latest-mac.yml']

/**
 * Rename any release files that contain spaces to hyphenated names.
 * GitHub Releases rewrites spaces to dots; electron-updater latest.yml uses hyphens.
 */
export function sanitizeReleaseFilenames(releaseDir) {
  const renamed = []
  for (const name of readdirSync(releaseDir)) {
    if (!name.includes(' ')) {
      continue
    }
    const next = name.replaceAll(' ', '-')
    renameSync(join(releaseDir, name), join(releaseDir, next))
    renamed.push(`${name} → ${next}`)
  }
  return renamed
}

/** Collect path / url values from an electron-builder latest*.yml body. */
export function collectUpdaterPaths(ymlText) {
  const paths = []
  for (const line of ymlText.split(/\r?\n/)) {
    const match = /^\s*(?:-\s*)?(?:path|url):\s*(.+?)\s*$/.exec(line)
    if (match?.[1]) {
      paths.push(match[1])
    }
  }
  return paths
}

function isUnsafePath(url) {
  return url.includes(' ') || url.includes('..') || url.includes('/') || url.includes('\\')
}

function verifyMetaFile(releaseDir, metaName) {
  const metaPath = join(releaseDir, metaName)
  if (!existsSync(metaPath)) {
    return { ok: false, error: `missing ${metaName}` }
  }
  const urls = collectUpdaterPaths(readFileSync(metaPath, 'utf8'))
  if (urls.length === 0) {
    return { ok: false, error: `${metaName} has no path/url entries` }
  }
  for (const url of urls) {
    if (isUnsafePath(url)) {
      return { ok: false, error: `${metaName} has unsafe url: ${url}` }
    }
    if (!existsSync(join(releaseDir, url))) {
      return {
        ok: false,
        error: `${metaName} references ${url} but file is missing`
      }
    }
  }
  return { ok: true, metaName, pathCount: urls.length }
}

/**
 * Verify updater metadata against on-disk release files.
 * Requires latest.yml; verifies latest-mac.yml only when present (mac DMG is manual-only today).
 */
export function verifyUpdaterMetadata(releaseDir) {
  const checked = []
  for (const metaName of REQUIRED_META) {
    const result = verifyMetaFile(releaseDir, metaName)
    if (!result.ok) {
      return { ok: false, error: result.error, checked }
    }
    checked.push(metaName)
  }
  for (const metaName of OPTIONAL_META) {
    if (!existsSync(join(releaseDir, metaName))) {
      continue
    }
    const result = verifyMetaFile(releaseDir, metaName)
    if (!result.ok) {
      return { ok: false, error: result.error, checked }
    }
    checked.push(metaName)
  }
  return { ok: true, checked }
}

export function runVerifyReleaseArtifacts(releaseDir = 'release') {
  const renamed = sanitizeReleaseFilenames(releaseDir)
  for (const line of renamed) {
    console.log(`sanitized: ${line}`)
  }
  const result = verifyUpdaterMetadata(releaseDir)
  if (!result.ok) {
    console.error(result.error)
    const files = readdirSync(releaseDir).sort()
    console.error('release files:', files.join(', '))
    process.exit(1)
  }
  for (const meta of result.checked) {
    console.log(`${meta}: ok`)
  }
  return result
}

const isCli =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href

if (isCli) {
  runVerifyReleaseArtifacts(process.argv[2] ?? 'release')
}
