import {
  app,
  Menu,
  MenuItem,
  type BrowserWindow,
  type ContextMenuParams,
  type Session,
  type WebContents
} from 'electron'

export function spellCheckerLanguages(locale: string): string[] {
  const primary = locale.trim()
  const base = primary.split('-')[0]?.trim() ?? ''
  return [...new Set([primary, base, 'en-US'].filter((lang) => lang.length > 0))]
}

function appendSpellSuggestions(
  menu: Menu,
  webContents: WebContents,
  session: Session,
  params: ContextMenuParams
): void {
  if (!params.misspelledWord) {
    return
  }

  for (const suggestion of params.dictionarySuggestions) {
    menu.append(
      new MenuItem({
        label: suggestion,
        click: () => webContents.replaceMisspelling(suggestion)
      })
    )
  }

  if (params.dictionarySuggestions.length > 0) {
    menu.append(new MenuItem({ type: 'separator' }))
  }

  menu.append(
    new MenuItem({
      label: 'Add to dictionary',
      click: () => session.addWordToSpellCheckerDictionary(params.misspelledWord)
    })
  )
  menu.append(new MenuItem({ type: 'separator' }))
}

function appendEditActions(menu: Menu, params: ContextMenuParams): void {
  if (params.isEditable) {
    menu.append(new MenuItem({ role: 'cut' }))
    menu.append(new MenuItem({ role: 'copy' }))
    menu.append(new MenuItem({ role: 'paste' }))
    menu.append(new MenuItem({ role: 'selectAll' }))
    return
  }

  if (params.selectionText) {
    menu.append(new MenuItem({ role: 'copy' }))
  }
}

export function buildEditableContextMenu(
  webContents: WebContents,
  session: Session,
  params: ContextMenuParams
): Menu {
  const menu = new Menu()
  appendSpellSuggestions(menu, webContents, session, params)
  appendEditActions(menu, params)
  return menu
}

export function configureSpellcheck(window: BrowserWindow): void {
  const { webContents, webContents: { session } } = window
  session.setSpellCheckerLanguages(spellCheckerLanguages(app.getLocale()))

  webContents.on('context-menu', (_event, params) => {
    const menu = buildEditableContextMenu(webContents, session, params)
    if (menu.items.length > 0) {
      menu.popup()
    }
  })
}
