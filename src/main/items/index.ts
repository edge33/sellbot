import { readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getAppSettings, getSettings } from '../settings';
import path from 'path';
import type { Item } from '../../shared/types';

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
  try {
    for (const item of items) {
      if (item.photos) {
        item.photos = encodePics(item.photos);
      }
    }
  } catch (err) {
    console.log(err);
  }
  return items;
};

const getItemWithEncodedPics = (itemId: string) => {
  const item = getItem(itemId);
  try {
    if (item?.photos) {
      item.photos = encodePics(item.photos);
    }
    return item;
  } catch (err) {
    console.log(err);
  }
  return undefined;
};

const encodePics = (picturePaths: string[]) => {
  const encodedPics: string[] = [];
  for (const currentPic of picturePaths) {
    encodedPics.push(readFileSync(currentPic).toString('base64'));
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
  if (item) {
    unlinkSync(item.filePath);
  }
};

export {
  getItemsWithEncodedPics,
  getItemWithEncodedPics,
  getItem,
  updateItem,
  cloneItem,
  deleteItem
};
