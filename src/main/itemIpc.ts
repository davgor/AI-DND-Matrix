import { ipcMain } from 'electron'
import type { EquipFailureReason } from '../engine/equipment'
import type { EquipSlot } from '../shared/items/types'
import {
  equipCharacterItem,
  getValidEquipSlotsForItem,
  listCharacterItems,
  unequipCharacterSlot
} from '../db/repositories/characterItems'
import { consumePotion, removeOwnedItem } from '../db/repositories/itemFlows'
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

export interface DropItemInput {
  characterId: string
  characterItemId: string
  quantity?: number
}

export type EquipItemResponse = { ok: true } | { ok: false; reason: EquipFailureReason }

export function registerItemHandlers(): void {
  ipcMain.handle('characters:listItems', (_event, characterId: string) =>
    listCharacterItems(getDb(), characterId)
  )
  ipcMain.handle('characters:equipItem', (_event, input: EquipItemInput): EquipItemResponse =>
    equipCharacterItem(getDb(), input.characterId, input.characterItemId, input.slot)
  )
  ipcMain.handle('characters:unequipItem', (_event, input: UnequipItemInput) => {
    unequipCharacterSlot(getDb(), input.characterId, input.slot)
  })
  ipcMain.handle('characters:consumeItem', (_event, input: ConsumeItemInput) =>
    consumePotion(getDb(), input.characterId, input.itemId)
  )
  ipcMain.handle('characters:dropItem', (_event, input: DropItemInput) => {
    const removed = removeOwnedItem(
      getDb(),
      input.characterId,
      input.characterItemId,
      input.quantity ?? 1
    )
    return { ok: removed }
  })
  ipcMain.handle('characters:validEquipSlots', (_event, characterItemId: string, characterId: string) => {
    const items = listCharacterItems(getDb(), characterId)
    const row = items.find((entry) => entry.id === characterItemId)
    if (!row) {
      return []
    }
    return getValidEquipSlotsForItem(row.item)
  })
}
