import { ElectronAPI } from '@electron-toolkit/preload';
import { AppSettings, Item } from '@shared/types';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: unknown;
    onLog: unknown;
    onHtml: unknown;
    getSettings: () => Promise<AppSettings>;
    auth: () => Promise<void>;
    storeCookies: () => Promise<void>;
    storeSettings: (appSettings: Partial<AppSettings>) => Promise<void>;
    getItems: () => Promise<Item[]>;
    insertItem: (filePath: string) => Promise<void>;
  }
}
