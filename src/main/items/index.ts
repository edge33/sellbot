import { readdirSync, readFileSync, unlinkSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getAppSettings, getSettings } from '../settings';
import path from 'path';
import type { Item } from '../../shared/types';

const getTrashPath = () => {
  const { itemsPath } = getSettings();
  const trashPath = path.join(itemsPath, 'trash');
  if (!existsSync(trashPath)) mkdirSync(trashPath, { recursive: true });
  return trashPath;
};

const getItems = () => {
  const { itemsPath } = getSettings();

  const items: Item[] = [];
  try {
    const fileNames = readdirSync(itemsPath).filter((file) => file.endsWith('.json'));

    for (const fileName of fileNames) {
      const filePath = path.join(itemsPath, fileName);
      const item = JSON.parse(readFileSync(filePath, 'utf-8')) as Item;

      items.push({ ...item, filePath });
    }
  } catch (err) {
    console.log(err);
    return [];
  }
  return items;
};

const getItemsWithEncodedPics = () => {
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

const getItemWithEncodedPics = (itemId: string) => {
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

const encodePics = (picturePaths: string[]) => {
  const encodedPics: string[] = [];
  for (const currentPic of picturePaths) {
    // Se la stringa è già base64 (lunghezza > 260), usala direttamente
    if (currentPic.length > 260) {
      encodedPics.push(currentPic);
      continue;
    }
    try {
      encodedPics.push(readFileSync(currentPic).toString('base64'));
    } catch {
      // File non trovato o percorso non valido: salta
    }
  }
  return encodedPics;
};

const getItem = (itemId: string) => {
  const items = getItems();

  return items.find((item) => item.id === itemId);
};

const updateItem = (item: Item) => {
  try {
    if (item.id) {
      const currentItem = getItem(item.id);

      if (!currentItem) {
        return;
      }

      const newItem = { ...item };

      if (!item.photos?.length) {
        newItem.photos = currentItem?.photos;
      }

      writeFileSync(currentItem.filePath, JSON.stringify(newItem));
      return true;
    }

    const settings = getAppSettings();

    const id = uuidv4();
    const newItem = { ...item, id };
    writeFileSync(path.join(settings?.itemsPath as string, `${id}.json`), JSON.stringify(newItem));

    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};

const cloneItem = (itemId: string) => {
  const newItem = getItem(itemId);
  if (newItem) {
    delete newItem?.id;
    updateItem(newItem);
  }
};

const deleteItem = (itemId: string) => {
  const item = getItem(itemId);
  if (!item) return;
  const trashPath = getTrashPath();
  const trashFile = path.join(trashPath, `${itemId}.json`);
  const trashed = { ...item, deletedAt: new Date().toISOString() };
  writeFileSync(trashFile, JSON.stringify(trashed));
  unlinkSync(item.filePath);
};

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
        // Auto-cleanup: elimina definitivamente dopo 30 giorni
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

// Elimina file JSON dal cestino + foto dal disco
const _permanentlyDelete = (item: Item, trashFilePath: string) => {
  try { unlinkSync(trashFilePath); } catch { /* ignora */ }
  if (item.photos) {
    for (const photo of item.photos) {
      if (photo.length <= 260 && existsSync(photo)) {
        try { unlinkSync(photo); } catch { /* ignora */ }
      }
    }
  }
};

const restoreItem = (itemId: string) => {
  const trashPath = getTrashPath();
  const trashFile = path.join(trashPath, `${itemId}.json`);
  if (!existsSync(trashFile)) return false;
  const item = JSON.parse(readFileSync(trashFile, 'utf-8')) as Item;
  const { deletedAt: _, filePath: __, ...cleanItem } = item as Item & { filePath?: string };
  const { itemsPath } = getSettings();
  const destFile = path.join(itemsPath, `${itemId}.json`);
  writeFileSync(destFile, JSON.stringify(cleanItem));
  unlinkSync(trashFile);
  return true;
};

const permanentlyDeleteItem = (itemId: string) => {
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
  getTrashItems,
  restoreItem,
  permanentlyDeleteItem
};
