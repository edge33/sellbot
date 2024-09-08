import { BrowserWindow, ipcMain } from 'electron';
import { handleAuth, getAndStoreCookies, insertItem } from '../puppeteer';
import { getAppSettings, storeItemsPath } from '../settings';
import { getItems } from '../items';

const IPC_CHANNELS = {
  PUPPETEER_OPEN_LOGIN_PAGE: 'PUPPETEER_OPEN_LOGIN_PAGE',
  PUPPETEER_STORE_COOKIES: 'PUPPETEER_STORE_COOKIES',
  GET_SETTINGS: 'GET_SETTINGS',
  STORE_ITEMS_PATH: 'STORE_ITEMS_PATH',
  GET_ITEMS: 'GET_ITEMS',
  INSERT_ITEM: 'INSERT_ITEM'
};

const ipcs = (mainWindow: BrowserWindow) => {
  ipcMain.handle(IPC_CHANNELS.PUPPETEER_OPEN_LOGIN_PAGE, () => handleAuth(mainWindow.webContents));
  ipcMain.handle(IPC_CHANNELS.PUPPETEER_STORE_COOKIES, () => getAndStoreCookies());

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => getAppSettings());
  ipcMain.handle(IPC_CHANNELS.STORE_ITEMS_PATH, (_, itemsPath: string) =>
    storeItemsPath(itemsPath)
  );
  ipcMain.handle(IPC_CHANNELS.GET_ITEMS, () => getItems());
  ipcMain.handle(IPC_CHANNELS.INSERT_ITEM, (_, filePath: string) =>
    insertItem(mainWindow.webContents, filePath)
  );
};

export default ipcs;
export { IPC_CHANNELS };
