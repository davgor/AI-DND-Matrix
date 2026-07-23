/**
 * Contract for Windows NSIS uninstall cleanup of downloaded local LLM assets.
 * Kept in sync with build/installer.nsh and src/main/llamacpp/paths.ts.
 */

export const LLAMACPP_USERDATA_DIR_NAME = 'llamacpp'

/**
 * Validate that an NSIS include script prompts (default Yes) and only removes
 * the userData/llamacpp subtree — never the whole product AppData folder.
 */
export function assertNsisUninstallLocalLlmContract(nshText) {
  const text = String(nshText ?? '')
  if (!text.includes('!macro customUnInstall')) {
    throw new Error('installer.nsh must define !macro customUnInstall')
  }
  if (!/\$\{IfNot\}\s+\$\{isUpdated\}/.test(text) && !text.includes('${IfNot} ${isUpdated}')) {
    throw new Error('customUnInstall must skip cleanup when ${isUpdated}')
  }
  if (!text.includes('/SD IDYES')) {
    throw new Error('uninstall prompt must default to Yes (/SD IDYES)')
  }
  if (!/MessageBox\s+MB_YESNO/.test(text)) {
    throw new Error('customUnInstall must MessageBox MB_YESNO to ask about local LLM removal')
  }
  if (!text.includes(`\\${LLAMACPP_USERDATA_DIR_NAME}"`) && !text.includes(`\\${LLAMACPP_USERDATA_DIR_NAME}\\`)) {
    // Accept both ...\llamacpp" and ...\llamacpp\...
    if (!text.includes(`\\${LLAMACPP_USERDATA_DIR_NAME}`)) {
      throw new Error(`RMDir target must include \\${LLAMACPP_USERDATA_DIR_NAME}`)
    }
  }

  const wipeWholeProduct =
    /RMDir\s+\/r\s+"\$APPDATA\\\$\{APP_(?:PRODUCT_FILENAME|FILENAME|PACKAGE_NAME)\}"/g
  const matches = text.match(wipeWholeProduct) ?? []
  if (matches.length > 0) {
    throw new Error(
      'Must not RMDir the entire $APPDATA product folder; only delete the llamacpp subdirectory'
    )
  }

  const llamacppRm =
    /RMDir\s+\/r\s+"\$APPDATA\\\$\{APP_(?:PRODUCT_FILENAME|FILENAME|PACKAGE_NAME)\}\\llamacpp"/g
  if ((text.match(llamacppRm) ?? []).length === 0) {
    throw new Error('Must RMDir /r "$APPDATA\\${APP_…}\\llamacpp" for at least one AppData macro')
  }
}
