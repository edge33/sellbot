import { electronAPI } from '@electron-toolkit/preload';
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../main/ipcs';
import { AppSettings } from '../shared/types';
// Custom APIs for renderer
const api = {};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
    contextBridge.exposeInMainWorld('auth', () =>
      ipcRenderer.invoke(IPC_CHANNELS.PUPPETEER_OPEN_LOGIN_PAGE)
    );
    contextBridge.exposeInMainWorld('storeCookies', () =>
      ipcRenderer.invoke(IPC_CHANNELS.PUPPETEER_STORE_COOKIES)
    );
    contextBridge.exposeInMainWorld('onLog', (callback) => ipcRenderer.on('log', callback));
    contextBridge.exposeInMainWorld('getSettings', () =>
      ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS)
    );
    contextBridge.exposeInMainWorld('storeSettings', (appSettings: AppSettings) =>
      ipcRenderer.invoke(IPC_CHANNELS.STORE_SETTINGS, appSettings)
    );
    contextBridge.exposeInMainWorld('getItems', () => ipcRenderer.invoke(IPC_CHANNELS.GET_ITEMS));
    contextBridge.exposeInMainWorld('insertItem', (filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.INSERT_ITEM, filePath)
    );
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
