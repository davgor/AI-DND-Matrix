import { ipcMain } from 'electron'
import type { EquipSlot } from '../shared/items/types'
import {
  equipCharacterItem,
  listCharacterItems,
  unequipCharacterSlot
} from '../db/repositories/characterItems'
import { consumePotion } from '../db/repositories/itemFlows'
import { getDb } from './db'

export interface EquipItemInput {
  characterId: string
  characterItemId: string
  slot: EquipSlot
}

export interface UnequipItemInput {
  characterId: string
  slot: EquipSlot
}

export interface ConsumeItemInput {
  characterId: string
  itemId: string
}

export function registerItemHandlers(): void {
  ipcMain.handle('characters:listItems', (_event, characterId: string) =>
    listCharacterItems(getDb(), characterId)
  )
  ipcMain.handle('characters:equipItem', (_event, input: EquipItemInput) =>
    equipCharacterItem(getDb(), input.characterId, input.characterItemId, input.slot)
  )
  ipcMain.handle('characters:unequipItem', (_event, input: UnequipItemInput) => {
    unequipCharacterSlot(getDb(), input.characterId, input.slot)
  })
  ipcMain.handle('characters:consumeItem', (_event, input: ConsumeItemInput) =>
    consumePotion(getDb(), input.characterId, input.itemId)
  )
}
