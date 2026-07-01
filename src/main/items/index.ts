import { readdirSync, readFileSync, unlinkSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getAppSettings, getSettings } from '../settings';
import path from 'path';
import type { Item } from '../../shared/types';

// =================== CACHE ====================
// Items: tutti gli item del folder itemsPath letti una volta sola.
// Photos: mappa filePath → base64, popolata pigramente quando serve.
// Invalidata su qualunque write/delete.
// Side benefit: rilettura/encoding evitata sui successivi render della dashboard.

let itemsCache: Item[] | null = null;
let cachedItemsPath: string | null = null;
const photoCache = new Map<string, string>(); // path → base64

const invalidateItems = (): void => {
  itemsCache = null;
  // NOTA: photoCache non viene invalidata, le foto sono immutabili una volta caricate
};

const invalidatePhoto = (photoPath: string): void => {
  photoCache.delete(photoPath);
};

// =================== READ ====================

const getTrashPath = () => {
  const { itemsPath } = getSettings();
  const trashPath = path.join(itemsPath, 'trash');
  if (!existsSync(trashPath)) mkdirSync(trashPath, { recursive: true });
  return trashPath;
};

const readAllItemsFromDisk = (): Item[] => {
  const { itemsPath } = getSettings() ?? {};
  if (!itemsPath) return [];
  const items: Item[] = [];
  try {
    const fileNames = readdirSync(itemsPath).filter((file) => file.endsWith('.json'));
    for (const fileName of fileNames) {
      const filePath = path.join(itemsPath, fileName);
      try {
        const item = JSON.parse(readFileSync(filePath, 'utf-8')) as Item;
        items.push({ ...item, filePath });
      } catch (err) {
        console.log(`[items] skip file corrotto ${fileName}:`, err);
      }
    }
  } catch (err) {
    console.log('[items] errore lettura cartella:', err);
    return [];
  }
  return items;
};

const getItems = (): Item[] => {
  // Invalida cache se itemsPath è cambiato (utente ha modificato Settings)
  const currentPath = getSettings()?.itemsPath ?? null;
  if (cachedItemsPath !== currentPath) {
    itemsCache = null;
    cachedItemsPath = currentPath;
  }
  if (itemsCache === null) {
    itemsCache = readAllItemsFromDisk();
  }
  // Ritorna copia shallow per evitare mutazioni accidentali della cache
  return itemsCache.map((i) => ({ ...i, photos: i.photos ? [...i.photos] : undefined }));
};

const getItem = (itemId: string): Item | undefined => {
  return getItems().find((item) => item.id === itemId);
};

// Codifica una foto in base64 con cache.
const encodeOnePhoto = (photo: string): string | null => {
  // Se è già base64 (lungo) usalo direttamente
  if (photo.length > 260) return photo;
  // Cache hit
  const cached = photoCache.get(photo);
  if (cached) return cached;
  // Cache miss: leggi e codifica
  try {
    const encoded = readFileSync(photo).toString('base64');
    photoCache.set(photo, encoded);
    return encoded;
  } catch {
    return null;
  }
};

const encodePics = (picturePaths: string[]): string[] => {
  const out: string[] = [];
  for (const p of picturePaths) {
    const enc = encodeOnePhoto(p);
    if (enc) out.push(enc);
  }
  return out;
};

const getItemsWithEncodedPics = (): Item[] => {
  const items = getItems();
  for (const item of items) {
    if (item.photos) {
      try {
        item.photos = encodePics(item.photos);
      } catch (err) {
        console.log(err);
        item.photos = [];
      }
    }
  }
  return items;
};

const getItemWithEncodedPics = (itemId: string): Item | undefined => {
  const item = getItem(itemId);
  if (!item) return undefined;
  try {
    if (item.photos) {
      item.photos = encodePics(item.photos);
    }
  } catch (err) {
    console.log(err);
    item.photos = [];
  }
  return item;
};

// =================== WRITE ====================

const updateItem = (item: Item): boolean => {
  try {
    if (item.id) {
      const currentItem = getItem(item.id);
      if (!currentItem) return false;

      const newItem = { ...item };
      if (!item.photos?.length) {
        newItem.photos = currentItem.photos;
      }

      const targetFilePath = currentItem.filePath;
      if (!targetFilePath) return false;
      writeFileSync(targetFilePath, JSON.stringify(newItem));
      invalidateItems();
      return true;
    }

    const settings = getAppSettings();
    if (!settings?.itemsPath) return false;

    const id = uuidv4();
    const newItem = { ...item, id };
    writeFileSync(path.join(settings.itemsPath, `${id}.json`), JSON.stringify(newItem));
    invalidateItems();
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};

const archiveItem = (itemId: string): boolean => {
  const item = getItem(itemId);
  if (!item || !item.filePath) return false;
  const newItem = { ...item, archived: true, archivedAt: new Date().toISOString() };
  writeFileSync(item.filePath, JSON.stringify(newItem));
  invalidateItems();
  return true;
};

const unarchiveItem = (itemId: string): boolean => {
  const item = getItem(itemId);
  if (!item || !item.filePath) return false;
  const { archived: _a, archivedAt: _b, ...rest } = item;
  writeFileSync(item.filePath, JSON.stringify(rest));
  invalidateItems();
  return true;
};

const cloneItem = (itemId: string): void => {
  const orig = getItem(itemId);
  if (!orig) return;
  // Rimuovi id e filePath: updateItem creerà un nuovo file con nuovo uuid
  const { id: _, filePath: __, ...rest } = orig as Item & { filePath?: string };
  updateItem({ ...rest, photos: orig.photos ? [...orig.photos] : undefined } as Item);
};

const deleteItem = (itemId: string): void => {
  const item = getItem(itemId);
  if (!item || !item.filePath) return;
  const trashPath = getTrashPath();
  const trashFile = path.join(trashPath, `${itemId}.json`);
  const trashed = { ...item, deletedAt: new Date().toISOString() };
  writeFileSync(trashFile, JSON.stringify(trashed));
  unlinkSync(item.filePath);
  invalidateItems();
};

// =================== TRASH ====================

const getTrashItems = (): Item[] => {
  try {
    const trashPath = getTrashPath();
    const files = readdirSync(trashPath).filter((f) => f.endsWith('.json'));
    const items: Item[] = [];
    const THIRTY_DAYS = 30 * 24 * 3600 * 1000;
    const now = Date.now();
    for (const file of files) {
      const filePath = path.join(trashPath, file);
      try {
        const item = JSON.parse(readFileSync(filePath, 'utf-8')) as Item;
        if (item.deletedAt && now - new Date(item.deletedAt).getTime() > THIRTY_DAYS) {
          _permanentlyDelete(item, filePath);
          continue;
        }
        items.push({ ...item, filePath });
      } catch { /* skip file corrotto */ }
    }
    return items;
  } catch {
    return [];
  }
};

const _permanentlyDelete = (item: Item, trashFilePath: string): void => {
  try { unlinkSync(trashFilePath); } catch { /* ignora */ }
  if (item.photos) {
    for (const photo of item.photos) {
      if (photo.length <= 260 && existsSync(photo)) {
        try {
          unlinkSync(photo);
          invalidatePhoto(photo);
        } catch { /* ignora */ }
      }
    }
  }
};

const restoreItem = (itemId: string): boolean => {
  const trashPath = getTrashPath();
  const trashFile = path.join(trashPath, `${itemId}.json`);
  if (!existsSync(trashFile)) return false;
  const item = JSON.parse(readFileSync(trashFile, 'utf-8')) as Item;
  const { deletedAt: _, filePath: __, ...cleanItem } = item as Item & { filePath?: string };
  const { itemsPath } = getSettings();
  const destFile = path.join(itemsPath, `${itemId}.json`);
  writeFileSync(destFile, JSON.stringify(cleanItem));
  unlinkSync(trashFile);
  invalidateItems();
  return true;
};

const permanentlyDeleteItem = (itemId: string): boolean => {
  const trashPath = getTrashPath();
  const trashFile = path.join(trashPath, `${itemId}.json`);
  if (!existsSync(trashFile)) return false;
  const item = JSON.parse(readFileSync(trashFile, 'utf-8')) as Item;
  _permanentlyDelete(item, trashFile);
  return true;
};

export {
  getItems,
  getItemsWithEncodedPics,
  getItemWithEncodedPics,
  getItem,
  updateItem,
  cloneItem,
  deleteItem,
  archiveItem,
  unarchiveItem,
  getTrashItems,
  restoreItem,
  permanentlyDeleteItem,
  invalidateItems
};
