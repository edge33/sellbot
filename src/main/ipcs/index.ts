import { BrowserWindow, ipcMain } from 'electron';
import { handleAuth, getAndStoreCookies, insertItem } from '../puppeteer';
import { getAppSettings, storeSettings } from '../settings';
import { getItems } from '../items';
import { AppSettings } from '../../shared/types';

const IPC_CHANNELS = {
  PUPPETEER_OPEN_LOGIN_PAGE: 'PUPPETEER_OPEN_LOGIN_PAGE',
  PUPPETEER_STORE_COOKIES: 'PUPPETEER_STORE_COOKIES',
  GET_SETTINGS: 'GET_SETTINGS',
  STORE_SETTINGS: 'STORE_SETTINGS',
  GET_ITEMS: 'GET_ITEMS',
  INSERT_ITEM: 'INSERT_ITEM'
};

const ipcs = (mainWindow: BrowserWindow) => {
  ipcMain.handle(IPC_CHANNELS.PUPPETEER_OPEN_LOGIN_PAGE, () => handleAuth(mainWindow.webContents));
  ipcMain.handle(IPC_CHANNELS.PUPPETEER_STORE_COOKIES, () => getAndStoreCookies());

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => getAppSettings());
  ipcMain.handle(IPC_CHANNELS.STORE_SETTINGS, (_, appSettings: AppSettings) =>
    storeSettings(appSettings)
  );
  ipcMain.handle(IPC_CHANNELS.GET_ITEMS, () => getItems());
  ipcMain.handle(IPC_CHANNELS.INSERT_ITEM, (_, filePath: string) =>
    insertItem(mainWindow.webContents, filePath)
  );
};

export default ipcs;
export { IPC_CHANNELS };
