import { WebContents } from 'electron';
import puppeteer, { Browser, ElementHandle, Page } from 'puppeteer-core';
import { getSettings, storeCookies } from '../settings';
import { getItem } from '../items';
import path from 'path';

let isRunning = false;
let puppeteerBrowser: Browser;
let puppeteerPage: Page;

const ACTION_TIMEOUT = 1000;

const delay = (timeout: number) =>
  new Promise<void>((resolve) => setTimeout(() => resolve(), timeout));

const withRunningCheck = <T extends unknown[]>(
  fn: (callback: () => void, ...params: T) => Promise<void>
) => {
  return (...params: T) => {
    if (isRunning) {
      return;
    }

    isRunning = true;
    const callback = () => {
      isRunning = false;
    };

    fn(callback, ...params);
  };
};
const handleAuth = withRunningCheck(async (callback: () => void, webContents: WebContents) => {
  puppeteerBrowser = await puppeteer.launch({
    executablePath: './ungoogled-chromium_128.0.6613.84-1_linux/chrome',
    defaultViewport: {
      width: 1366,
      height: 768
    },
    headless: false // Puppeteer controlled browser should be visible
  });

  puppeteerPage = await puppeteerBrowser.newPage();

  //TODO: Move this to actual action with auth
  // const cookies = getSettings().cookies;
  // for (const cookie of cookies) {
  //   puppeteerPage.setCookie(cookie);
  // }

  // Load a URL or website
  await puppeteerPage.goto('https://subito.it');
  webContents.send('log', 'Opened page');

  try {
    (
      await puppeteerPage.waitForSelector('#didomi-notice-agree-button', { timeout: 5000 })
    )?.click();
  } catch (err) {
    console.log('cookie banner not found');
  }
  webContents.send('log', 'Cookies accepted');

  puppeteerPage.on('close', () => {
    console.log('page was closed ');
    callback();
  });
});

const getAndStoreCookies = async () => {
  if (!isRunning) {
    return;
  }

  const cookies = await puppeteerPage.cookies();

  storeCookies(cookies);
  puppeteerBrowser.close();
};

const insertItem = withRunningCheck(
  async (callback: () => void, webContents: WebContents, itemPath: string) => {
    puppeteerBrowser = await puppeteer.launch({
      executablePath: 'ungoogled-chromium/chrome',
      // defaultViewport: {
      //   width: 1366,
      //   height: 768
      // },
      headless: false // Puppeteer controlled browser should be visible
    });

    puppeteerPage = await puppeteerBrowser.newPage();

    const item = getItem(itemPath);
    if (!item) {
      console.error(`Item ${itemPath} was not found`);
      callback();
      return;
    }

    const appSettings = getSettings();

    puppeteerPage.on('close', () => {
      console.log('page was closed ');
      callback();
    });

    //TODO: Move this to actual action with auth
    const cookies = getSettings().cookies;
    for (const cookie of cookies) {
      puppeteerPage.setCookie(cookie);
    }

    // Load a URL or website
    await puppeteerPage.goto('https://inserimento.subito.it/?category=10&from=vendere');
    webContents.send('log', 'Opened page');

    await puppeteerPage.waitForSelector('#title');

    // TODO: make this dynamic
    (await puppeteerPage.$('#menu-elettronica'))?.click();

    const title = await puppeteerPage.$('#title');
    const description = await puppeteerPage.$('#description');
    const price = await puppeteerPage.$('#price');
    const location = await puppeteerPage.$('#location');
    const fileInput = (await puppeteerPage.$('#file-input')) as ElementHandle<HTMLInputElement>;
    const phone = await puppeteerPage.$('#phone');

    const conditionSelector = await puppeteerPage.$(
      '::-p-xpath(/html/body/div/div/main/div[2]/form/div/section[5]/div[2]/div)'
    );

    await title?.type(item.title);
    webContents.send('log', 'set title');
    await delay(ACTION_TIMEOUT);

    for (const picture of item.photos) {
      await fileInput.uploadFile(picture);
    }
    webContents.send('log', 'set pics');
    await delay(ACTION_TIMEOUT);

    await description?.type(item.description);
    webContents.send('log', 'set description');
    await delay(ACTION_TIMEOUT);

    await conditionSelector?.click();
    await delay(ACTION_TIMEOUT);
    (await puppeteerPage.$(`#itemCondition__option--${item.condition}`))?.click();
    webContents.send('log', 'set condition');
    await delay(ACTION_TIMEOUT);

    const computerTypeSelector = await puppeteerPage.waitForSelector(
      '::-p-xpath(/html/body/div/div/main/div[2]/form/div/section[6]/div[2]/div)'
    );

    await computerTypeSelector?.click();
    await delay(ACTION_TIMEOUT);
    (await puppeteerPage.waitForSelector(`#computerType__option--${item.type}`))?.click();
    webContents.send('log', 'set type');
    await delay(ACTION_TIMEOUT);

    await location?.type('Cosenza');
    await delay(ACTION_TIMEOUT);
    (await puppeteerPage.waitForSelector('#autocomplete-location-item-0'))?.click();
    webContents.send('log', 'set location');
    await delay(ACTION_TIMEOUT);

    await price?.type(`${item.price}`);
    webContents.send('log', 'set price');
    await delay(ACTION_TIMEOUT);

    (
      await puppeteerPage.$(
        `::-p-xpath(/html/body/div/div/main/div[2]/form/div/section[11]/section/label[${item.dimension}])`
      )
    )?.click();

    webContents.send('log', 'set dimension');
    await delay(ACTION_TIMEOUT);

    phone?.type(appSettings.mobilePhone);
    webContents.send('log', 'set mobile phone');
    await delay(ACTION_TIMEOUT);

    const submitButton = await puppeteerPage.$(
      '::-p-xpath(/html/body/div/div/main/div[2]/form/section/button)'
    );

    submitButton?.click();
    webContents.send('log', 'submit');
    await delay(ACTION_TIMEOUT);

    const publishButton = await puppeteerPage.waitForSelector(
      '::-p-xpath(/html/body/div/div/main/div[2]/div/section/button[2])'
    );

    await publishButton?.click();
    webContents.send('log', 'publish');
    await delay(ACTION_TIMEOUT);

    const skipVisibilityButton = await puppeteerPage.waitForSelector(
      '::-p-xpath(html/body/div[2]/div/main/section/footer/div/button)'
    );

    await skipVisibilityButton?.click();
    webContents.send('log', 'skip visibility');
    await delay(ACTION_TIMEOUT);

    const thankYouPage = await puppeteerPage.waitForSelector(
      '::-p-xpath(//*[@id="__next"]/div/main/div[2]/div[1]/h1)'
    );

    if (await thankYouPage?.isVisible()) {
      webContents.send('log', 'placement complete');
    }
    callback();
    await puppeteerBrowser.close();
  }
);

export { handleAuth, getAndStoreCookies, insertItem };
