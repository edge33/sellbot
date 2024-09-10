import { app } from 'electron';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import type { AppSettings } from '../../shared/types';
import { Cookie } from 'puppeteer-core';

const getConfigFilePath = () => {
  const appDataPath = app.getPath('appData');
  const filePath = path.join(appDataPath, 'sellbot', 'config.json');

  return filePath;
};

const getSettings = () => {
  try {
    const filePath = getConfigFilePath();
    const storedSettings = JSON.parse(readFileSync(filePath, 'utf-8'));
    return storedSettings;
  } catch (err) {
    console.log(err);
  }
  return undefined;
};

const getAppSettings = (): AppSettings | undefined => {
  const settings = getSettings();

  if (!settings) {
    return undefined;
  }

  return {
    chromiumPath: settings?.chromiumPath,
    cookiesStored: settings?.cookies?.length > 0,
    itemsPath: settings?.itemsPath,
    mobilePhone: settings?.mobilePhone
  };
};

const storeCookies = (cookies: Cookie[]) => {
  const settings = getSettings();

  let newSettings = {};
  if (settings) {
    newSettings = { ...settings, cookies };
  } else {
    newSettings = { cookies };
  }

  const filePath = getConfigFilePath();

  writeFileSync(filePath, JSON.stringify(newSettings));
};

const storeSettings = (appSettings: AppSettings) => {
  const settings = getSettings();

  let newSettings = {};
  if (settings) {
    newSettings = { ...settings, ...appSettings };
  } else {
    newSettings = { appSettings };
  }

  const filePath = getConfigFilePath();

  writeFileSync(filePath, JSON.stringify(newSettings));
};

export { getAppSettings, storeCookies, getSettings, storeSettings };
