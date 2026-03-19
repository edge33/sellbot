import { BrowserWindow, ipcMain } from 'electron';
import { handleAuth, getAndStoreCookies, insertItems, removeListings } from '../puppeteer';
import { getAppSettings, storeSettings, getSettings } from '../settings';
import {
  getItemWithEncodedPics,
  updateItem,
  getItemsWithEncodedPics,
  cloneItem,
  deleteItem
} from '../items';
import { AppSettings, Item } from '../../shared/types';
import { net } from 'electron';

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
  DELETE_ITEM: 'DELETE_ITEM',
  REMOVE_LISTINGS: 'REMOVE_LISTINGS',
  GET_COOKIES: 'GET_COOKIES',
  FETCH_VEHICLE_CONFIG: 'FETCH_VEHICLE_CONFIG',
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

  ipcMain.handle(IPC_CHANNELS.REMOVE_LISTINGS, (_, itemIds: string[]) =>
    removeListings(mainWindow.webContents, itemIds)
  );

  ipcMain.handle(IPC_CHANNELS.GET_ITEMS, () => getItemsWithEncodedPics());
  ipcMain.handle(IPC_CHANNELS.GET_ITEM, (_, itemId: string) => getItemWithEncodedPics(itemId));
  ipcMain.handle(IPC_CHANNELS.UPDATE_ITEM, (_, item: Item) => updateItem(item));
  ipcMain.handle(IPC_CHANNELS.CLONE_ITEM, (_, itemId: string) => cloneItem(itemId));
  ipcMain.handle(IPC_CHANNELS.DELETE_ITEM, (_, itemId: string) => deleteItem(itemId));
  ipcMain.handle(IPC_CHANNELS.GET_COOKIES, () => {
    const settings = getSettings();
    const cookies = settings?.cookies || [];
    const userDataCookie = cookies.find((c: any) => c.name === 'user_data');
    if (userDataCookie) {
      try {
        const userData = JSON.parse(decodeURIComponent(userDataCookie.value));
        return { userId: userData.id, cookies };
      } catch {
        return { userId: null, cookies };
      }
    }
    return { userId: null, cookies };
  });
  ipcMain.handle(IPC_CHANNELS.FETCH_VEHICLE_CONFIG, async (_, userId: string, categoryId: string, brandCode?: string, modelCode?: string) => {
    const settings = getSettings();
    const cookies = settings?.cookies || [];
    const cookieHeader = cookies
      .filter((c: any) => c.domain?.includes('subito.it'))
      .map((c: any) => `${c.name}=${c.value}`)
      .join('; ');

    const url = brandCode && modelCode
    
      ? `https://hades.subito.it/v1/insertion/user/${userId}/configuration/category/${categoryId}?type=sell&carbrand=${brandCode}&carmodel=${modelCode}`
      : brandCode
      ? `https://hades.subito.it/v1/insertion/user/${userId}/configuration/category/${categoryId}?type=sell&carbrand=${brandCode}`
      : `https://hades.subito.it/v1/insertion/user/${userId}/configuration/category/${categoryId}?type=sell`;

    console.log('brandCode:', brandCode, 'modelCode:', modelCode);
    console.log('Fetching URL:', url);
    console.log('Cookie header length:', cookieHeader.length);

    return new Promise((resolve) => {
      const request = net.request({
        method: 'GET',
        url,
        session: undefined
      });
      request.setHeader('Cookie', cookieHeader);
      request.setHeader('Origin', 'https://inserimento.subito.it');
      request.setHeader('Referer', 'https://inserimento.subito.it/');
      request.setHeader('X-Subito-Channel', 'web-desktop');
      request.setHeader('Accept', 'application/json');
      request.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      let body = '';
      request.on('response', (response) => {
        response.on('data', (chunk) => { body += chunk.toString(); });
        response.on('end', () => {
          console.log('Response body length:', body.length);
          console.log('First 200 chars:', body.substring(0, 200));
          try { resolve(JSON.parse(body)); }
          catch { resolve({}); }
        });
      });
      request.on('error', () => resolve({}));
      request.end();
    });
  });
};

export default ipcs;
export { IPC_CHANNELS };
