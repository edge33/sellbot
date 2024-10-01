import { BrowserWindow, ipcMain } from 'electron';
import { handleAuth, getAndStoreCookies, insertItems } from '../puppeteer';
import { getAppSettings, storeSettings } from '../settings';
import {
  getItemWithEncodedPics,
  updateItem,
  getItemsWithEncodedPics,
  cloneItem,
  deleteItem
} from '../items';
import { AppSettings, Item } from '../../shared/types';

const IPC_CHANNELS = {
  PUPPETEER_OPEN_LOGIN_PAGE: 'PUPPETEER_OPEN_LOGIN_PAGE',
  PUPPETEER_STORE_COOKIES: 'PUPPETEER_STORE_COOKIES',
  GET_SETTINGS: 'GET_SETTINGS',
  STORE_SETTINGS: 'STORE_SETTINGS',
  GET_ITEMS: 'GET_ITEMS',
  GET_ITEM: 'GET_ITEM',
  INSERT_ITEMS: 'INSERT_ITEMS',
  UPDATE_ITEM: 'UPDATE_ITEM',
  CLONE_ITEM: 'CLONE_ITEM',
  DELETE_ITEM: 'DELETE_ITEM'
};

const ipcs = (mainWindow: BrowserWindow) => {
  ipcMain.handle(IPC_CHANNELS.PUPPETEER_OPEN_LOGIN_PAGE, () => handleAuth(mainWindow.webContents));
  ipcMain.handle(IPC_CHANNELS.PUPPETEER_STORE_COOKIES, () => getAndStoreCookies());

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => getAppSettings());
  ipcMain.handle(IPC_CHANNELS.STORE_SETTINGS, (_, appSettings: AppSettings) =>
    storeSettings(appSettings)
  );

  ipcMain.handle(IPC_CHANNELS.INSERT_ITEMS, (_, itemIds: string[]) =>
    insertItems(mainWindow.webContents, itemIds)
  );

  ipcMain.handle(IPC_CHANNELS.GET_ITEMS, () => getItemsWithEncodedPics());
  ipcMain.handle(IPC_CHANNELS.GET_ITEM, (_, itemId: string) => getItemWithEncodedPics(itemId));
  ipcMain.handle(IPC_CHANNELS.UPDATE_ITEM, (_, item: Item) => updateItem(item));
  ipcMain.handle(IPC_CHANNELS.CLONE_ITEM, (_, itemId: string) => cloneItem(itemId));
  ipcMain.handle(IPC_CHANNELS.DELETE_ITEM, (_, itemId: string) => deleteItem(itemId));
};

export default ipcs;
export { IPC_CHANNELS };
