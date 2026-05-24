import { app, safeStorage } from 'electron';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import type { AppSettings } from '../../shared/types';
import { Cookie } from 'puppeteer-core';

const getConfigFilePath = () => {
  const appDataPath = app.getPath('appData');
  return path.join(appDataPath, 'sellbot', 'config.json');
};

// =================== ENCRYPTION (safeStorage) ===================
// safeStorage usa il keychain del SO (DPAPI su Windows, Keychain su macOS, libsecret su Linux).
// Se non disponibile (es. Linux senza keyring), salva in chiaro come fallback.
// I valori cifrati hanno prefisso 'enc:' per distinguerli dai legacy in chiaro.

const ENC_PREFIX = 'enc:';

const encryptString = (plain: string): string => {
  if (!safeStorage.isEncryptionAvailable()) return plain;
  try {
    const encrypted = safeStorage.encryptString(plain).toString('base64');
    return ENC_PREFIX + encrypted;
  } catch {
    return plain;
  }
};

const decryptString = (stored: string): string => {
  if (!stored.startsWith(ENC_PREFIX)) return stored; // legacy plaintext
  if (!safeStorage.isEncryptionAvailable()) return ''; // chiave persa
  try {
    const buf = Buffer.from(stored.slice(ENC_PREFIX.length), 'base64');
    return safeStorage.decryptString(buf);
  } catch {
    return '';
  }
};

// Campi sensibili che vanno cifrati on-disk
const SENSITIVE_FIELDS = ['geminiApiKey'];

const encryptForStorage = (settings: any): any => {
  if (!settings) return settings;
  const out = { ...settings };
  for (const k of SENSITIVE_FIELDS) {
    if (typeof out[k] === 'string' && out[k] && !out[k].startsWith(ENC_PREFIX)) {
      out[k] = encryptString(out[k]);
    }
  }
  // Cookies sono un array: cifriamo il JSON intero
  if (Array.isArray(out.cookies)) {
    const j = JSON.stringify(out.cookies);
    out.cookies = encryptString(j);
  }
  return out;
};

const decryptFromStorage = (settings: any): any => {
  if (!settings) return settings;
  const out = { ...settings };
  for (const k of SENSITIVE_FIELDS) {
    if (typeof out[k] === 'string' && out[k].startsWith(ENC_PREFIX)) {
      out[k] = decryptString(out[k]);
    }
  }
  if (typeof out.cookies === 'string' && out.cookies.startsWith(ENC_PREFIX)) {
    try {
      out.cookies = JSON.parse(decryptString(out.cookies));
    } catch {
      out.cookies = [];
    }
  }
  return out;
};

// =================== READ/WRITE ===================

const getSettings = () => {
  try {
    const filePath = getConfigFilePath();
    const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
    return decryptFromStorage(raw);
  } catch (err) {
    console.log(err);
  }
  return undefined;
};

const getAppSettings = (): AppSettings | undefined => {
  const settings = getSettings();
  if (!settings) return undefined;
  return {
    chromiumPath: settings?.chromiumPath,
    cookiesStored: settings?.cookies?.length > 0,
    itemsPath: settings?.itemsPath,
    mobilePhone: settings?.mobilePhone,
    location: settings?.location,
    geminiApiKey: settings?.geminiApiKey,
    descriptionSettings: settings?.descriptionSettings,
    statsRefreshHours: settings?.statsRefreshHours
  };
};

const writeEncrypted = (newSettings: any): void => {
  writeFileSync(getConfigFilePath(), JSON.stringify(encryptForStorage(newSettings)));
};

const storeCookies = (cookies: Cookie[]) => {
  const settings = getSettings();
  const newSettings = settings ? { ...settings, cookies } : { cookies };
  writeEncrypted(newSettings);
};

const storeSettings = (appSettings: AppSettings) => {
  const settings = getSettings();
  const newSettings = settings ? { ...settings, ...appSettings } : { ...appSettings };
  writeEncrypted(newSettings);
};

export { getAppSettings, storeCookies, getSettings, storeSettings };
