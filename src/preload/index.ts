import { electronAPI } from '@electron-toolkit/preload';
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../main/ipcs';
import { AppSettings, Item, Schedule } from '../shared/types';
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
    let _logListener: ((_event: Electron.IpcRendererEvent, message: string) => void) | null = null;
    contextBridge.exposeInMainWorld('onLog', (callback: (_event: unknown, message: string) => void) => {
      if (_logListener) ipcRenderer.removeListener('log', _logListener);
      _logListener = (_event, message) => callback(_event, message);
      ipcRenderer.on('log', _logListener);
    });
    contextBridge.exposeInMainWorld('offLog', () => {
      if (_logListener) {
        ipcRenderer.removeListener('log', _logListener);
        _logListener = null;
      }
    });
    contextBridge.exposeInMainWorld('getSettings', () =>
      ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS)
    );
    contextBridge.exposeInMainWorld('storeSettings', (appSettings: AppSettings) =>
      ipcRenderer.invoke(IPC_CHANNELS.STORE_SETTINGS, appSettings)
    );

    contextBridge.exposeInMainWorld('insertItems', (itemIds: string[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.INSERT_ITEMS, itemIds)
    );

    contextBridge.exposeInMainWorld('removeListings', (itemIds: string[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.REMOVE_LISTINGS, itemIds)
    );

    contextBridge.exposeInMainWorld('checkItemsStatus', (itemIds: string[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.CHECK_ITEMS_STATUS, itemIds)
    );

    contextBridge.exposeInMainWorld('getItems', () => ipcRenderer.invoke(IPC_CHANNELS.GET_ITEMS));
    contextBridge.exposeInMainWorld('getItem', (itemId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.GET_ITEM, itemId)
    );
    contextBridge.exposeInMainWorld('updateItem', (item: Item) =>
      ipcRenderer.invoke(IPC_CHANNELS.UPDATE_ITEM, item)
    );
    contextBridge.exposeInMainWorld('cloneItem', (itemId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.CLONE_ITEM, itemId)
    );
    contextBridge.exposeInMainWorld('deleteItem', (itemId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DELETE_ITEM, itemId)
    );
    contextBridge.exposeInMainWorld('getCookies', () =>
      ipcRenderer.invoke(IPC_CHANNELS.GET_COOKIES)
    );
    contextBridge.exposeInMainWorld('fetchVehicleConfig', (userId: string, categoryId: string, brandCode?: string, modelCode?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FETCH_VEHICLE_CONFIG, userId, categoryId, brandCode, modelCode)
    );
      contextBridge.exposeInMainWorld('generateDescription', (prompt: string, systemMessage?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.GENERATE_DESCRIPTION, prompt, systemMessage)
    );
    contextBridge.exposeInMainWorld('fetchPriceRange', (title: string, category: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FETCH_PRICE_RANGE, title, category)
    );
    contextBridge.exposeInMainWorld('extractProductInfo', (title: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.EXTRACT_PRODUCT_INFO, title)
    );
    contextBridge.exposeInMainWorld('searchEanByTitle', (title: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SEARCH_EAN_BY_TITLE, title)
    );
    contextBridge.exposeInMainWorld('lookupEanProduct', (ean: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.LOOKUP_EAN_PRODUCT, ean)
    );
    contextBridge.exposeInMainWorld('openExternal', (url: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL, url)
    );
    contextBridge.exposeInMainWorld('fetchItemsStats', (itemIds: string[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.FETCH_ITEMS_STATS, itemIds)
    );
    contextBridge.exposeInMainWorld('getTrashItems', () =>
      ipcRenderer.invoke(IPC_CHANNELS.GET_TRASH)
    );
    contextBridge.exposeInMainWorld('restoreItem', (itemId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.RESTORE_ITEM, itemId)
    );
    contextBridge.exposeInMainWorld('permanentlyDeleteItem', (itemId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.PERMANENTLY_DELETE_ITEM, itemId)
    );
    contextBridge.exposeInMainWorld('exportItems', () =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPORT_ITEMS)
    );
    contextBridge.exposeInMainWorld('importItems', () =>
      ipcRenderer.invoke(IPC_CHANNELS.IMPORT_ITEMS)
    );
    contextBridge.exposeInMainWorld('getSchedules', () =>
      ipcRenderer.invoke(IPC_CHANNELS.GET_SCHEDULES)
    );
    contextBridge.exposeInMainWorld('saveSchedule', (schedule: Schedule) =>
      ipcRenderer.invoke(IPC_CHANNELS.SAVE_SCHEDULE, schedule)
    );
    contextBridge.exposeInMainWorld('deleteSchedule', (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DELETE_SCHEDULE, id)
    );
    contextBridge.exposeInMainWorld('updateSchedule', (schedule: Schedule) =>
      ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SCHEDULE, schedule)
    );
    contextBridge.exposeInMainWorld('runScheduleNow', (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.RUN_SCHEDULE_NOW, id)
    );
    contextBridge.exposeInMainWorld('cancelOperation', () =>
      ipcRenderer.invoke(IPC_CHANNELS.CANCEL_OPERATION)
    );
    contextBridge.exposeInMainWorld('isBusy', () =>
      ipcRenderer.invoke(IPC_CHANNELS.IS_BUSY)
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
