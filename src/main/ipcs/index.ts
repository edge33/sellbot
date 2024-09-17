import { BrowserWindow, ipcMain } from 'electron';
import { handleAuth, getAndStoreCookies, insertItem } from '../puppeteer';
import { getAppSettings, storeSettings } from '../settings';
import { getItemWithEncodedPics, updateItem, getItemsWithEncodedPics } from '../items';
import { AppSettings, Item } from '../../shared/types';

const IPC_CHANNELS = {
  PUPPETEER_OPEN_LOGIN_PAGE: 'PUPPETEER_OPEN_LOGIN_PAGE',
  PUPPETEER_STORE_COOKIES: 'PUPPETEER_STORE_COOKIES',
  GET_SETTINGS: 'GET_SETTINGS',
  STORE_SETTINGS: 'STORE_SETTINGS',
  GET_ITEMS: 'GET_ITEMS',
  GET_ITEM: 'GET_ITEM',
  INSERT_ITEM: 'INSERT_ITEM',
  UPDATE_ITEM: 'UPDATE_ITEM'
};

const ipcs = (mainWindow: BrowserWindow) => {
  ipcMain.handle(IPC_CHANNELS.PUPPETEER_OPEN_LOGIN_PAGE, () => handleAuth(mainWindow.webContents));
  ipcMain.handle(IPC_CHANNELS.PUPPETEER_STORE_COOKIES, () => getAndStoreCookies());

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => getAppSettings());
  ipcMain.handle(IPC_CHANNELS.STORE_SETTINGS, (_, appSettings: AppSettings) =>
    storeSettings(appSettings)
  );

  ipcMain.handle(IPC_CHANNELS.INSERT_ITEM, (_, filePath: string) =>
    insertItem(mainWindow.webContents, filePath)
  );

  ipcMain.handle(IPC_CHANNELS.GET_ITEMS, () => getItemsWithEncodedPics());
  ipcMain.handle(IPC_CHANNELS.GET_ITEM, (_, itemId: string) => getItemWithEncodedPics(itemId));
  ipcMain.handle(IPC_CHANNELS.UPDATE_ITEM, (_, item: Item) => updateItem(item));
};

export default ipcs;
export { IPC_CHANNELS };
