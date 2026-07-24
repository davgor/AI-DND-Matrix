; Custom NSIS uninstall hooks for AI-TTRPG (electron-builder include).
; On manual uninstall, offer to remove downloaded local LLM assets under
; userData/llamacpp (models + runtime). Default answer is Yes. Campaign saves
; and settings stay. Skip during auto-update / reinstall (${isUpdated}).

!macro customUnInstall
  ${IfNot} ${isUpdated}
    ; Per-user Electron userData lives under the current user's Roaming AppData.
    SetShellVarContext current
    MessageBox MB_YESNO|MB_ICONQUESTION \
      "Remove downloaded local AI model and runtime from this PC?$\r$\n$\r$\nThis frees several GB of disk space. Campaign saves and settings are kept.$\r$\n$\r$\nChoose Yes to remove (recommended)." \
      /SD IDYES IDNO skip_llamacpp_cleanup

    !ifdef APP_PRODUCT_FILENAME
      RMDir /r "$APPDATA\${APP_PRODUCT_FILENAME}\llamacpp"
    !endif
    !ifdef APP_FILENAME
      RMDir /r "$APPDATA\${APP_FILENAME}\llamacpp"
    !endif
    !ifdef APP_PACKAGE_NAME
      RMDir /r "$APPDATA\${APP_PACKAGE_NAME}\llamacpp"
    !endif

    skip_llamacpp_cleanup:
  ${EndIf}
!macroend
