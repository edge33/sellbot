import { readdirSync, readFileSync } from 'fs';
import { getSettings } from '../settings';
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
      const previewPicture = item.photos[0];
      const _img = readFileSync(previewPicture).toString('base64');

      items.push({ ...item, filePath, photos: [_img] });
    }
  } catch (err) {
    console.log(err);
    return [];
  }
  return items;
};

const getItem = (filePath: string) => {
  let item: Item;
  try {
    item = JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.log(err);
    return undefined;
  }
  return item;
};

export { getItems, getItem };
