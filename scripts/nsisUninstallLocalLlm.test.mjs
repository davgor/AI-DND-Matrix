import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  assertNsisUninstallLocalLlmContract,
  LLAMACPP_USERDATA_DIR_NAME
} from './nsisUninstallLocalLlm.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('NSIS uninstall local LLM contract', () => {
  it('exports the stable userData subdirectory name used by path helpers', () => {
    expect(LLAMACPP_USERDATA_DIR_NAME).toBe('llamacpp')
  })

  it('requires installer.nsh to prompt (default Yes) and delete only llamacpp', () => {
    const nsh = readFileSync(join(ROOT, 'build', 'installer.nsh'), 'utf8')
    expect(() => assertNsisUninstallLocalLlmContract(nsh)).not.toThrow()
  })

  it('rejects scripts that wipe the entire AppData product folder', () => {
    const bad = `
!macro customUnInstall
  \${IfNot} \${isUpdated}
    MessageBox MB_YESNO "Remove?" /SD IDYES IDNO skip
    RMDir /r "$APPDATA\\\${APP_PRODUCT_FILENAME}"
    skip:
  \${EndIf}
!macroend
`
    expect(() => assertNsisUninstallLocalLlmContract(bad)).toThrow(/llamacpp/i)
  })
})
