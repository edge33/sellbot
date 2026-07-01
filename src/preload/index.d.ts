import { ElectronAPI } from '@electron-toolkit/preload';
import { AppSettings, Item, Schedule } from '@shared/types';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: unknown;
    onLog: (callback: (event: unknown, message: string) => void) => void;
    offLog: () => void;
    onHtml: unknown;
    getSettings: () => Promise<AppSettings>;
    auth: () => Promise<void>;
    storeCookies: () => Promise<void>;
    storeSettings: (appSettings: Partial<AppSettings>) => Promise<void>;
    insertItems: (itemIds: string[]) => Promise<void>;
    removeListings: (itemIds: string[]) => Promise<void>;
    checkItemsStatus: (itemIds: string[]) => Promise<void>;
    getItems: () => Promise<Item[]>;
    getItem: (fileId: string) => Promise<Item>;
    updateItem: (item: Item) => Promise<boolean>;
    cloneItem: (itemId: string) => Promise<void>;
    deleteItem: (itemId: string) => Promise<void>;
    archiveItem: (itemId: string) => Promise<boolean>;
    unarchiveItem: (itemId: string) => Promise<boolean>;
    getCookies: () => Promise<{ userId: string | null; cookies: any[] }>;
    getGeminiKey: () => Promise<string | null>;
    generateDescription: (prompt: string, systemMessage?: string) => Promise<string | null>;
    fetchPriceRange: (title: string, category: string) => Promise<{ source: 'subito' | 'ai'; min: number; max: number; avg: number; count: number; url?: string; detail?: string } | null>;
    extractProductInfo: (title: string) => Promise<{ cleanQuery: string; productName: string; keySpecs: string[] } | null>;
    searchEanByTitle: (title: string) => Promise<{ ean: string; title: string; description: string; brand: string } | null>;
    lookupEanProduct: (ean: string) => Promise<{ ean: string; title: string; description: string; brand: string } | null>;
    openExternal: (url: string) => Promise<void>;
    fetchVehicleConfig: (userId: string, categoryId: string, brandCode?: string, modelCode?: string) => Promise<any>;
    fetchItemsStats: (itemIds: string[]) => Promise<Record<string, { position?: string; views?: number; messages?: number; lastChecked: string }>>;
    exportItems: () => Promise<{ success: boolean }>;
    importItems: () => Promise<{ success: boolean; count: number; error?: string }>;
    getTrashItems: () => Promise<Item[]>;
    restoreItem: (itemId: string) => Promise<boolean>;
    permanentlyDeleteItem: (itemId: string) => Promise<boolean>;
    getSchedules: () => Promise<Schedule[]>;
    saveSchedule: (schedule: Schedule) => Promise<void>;
    deleteSchedule: (id: string) => Promise<void>;
    updateSchedule: (schedule: Schedule) => Promise<void>;
    runScheduleNow: (id: string) => Promise<void>;
    cancelOperation: () => Promise<void>;
    isBusy: () => Promise<boolean>;
  }
}
