import { WebContents } from 'electron';
import puppeteer, { Browser, ElementHandle, Page } from 'puppeteer-core';
import { getAppSettings, getSettings, storeCookies } from '../settings';
import { getItem } from '../items';

let isRunning = false;
let puppeteerBrowser: Browser;
let puppeteerPage: Page;

const ACTION_TIMEOUT = 1000;

const delay = (timeout: number) =>
  new Promise<void>((resolve) => setTimeout(() => resolve(), timeout));

const withRunningCheck = <T extends unknown[]>(
  fn: (callback: () => void, ...params: T) => Promise<void>
) => {
  return async (...params: T) => {
    if (isRunning) {
      return;
    }

    isRunning = true;
    const callback = () => {
      isRunning = false;
    };

    try {
      await fn(callback, ...params);
    } catch (err) {
      console.log(err);

      callback();
    }
  };
};
const handleAuth = withRunningCheck(async (callback: () => void, webContents: WebContents) => {
  const appSettings = getAppSettings();

  if (!appSettings) {
    callback();
    return;
  }

  const { chromiumPath } = appSettings;

  puppeteerBrowser = await puppeteer.launch({
    executablePath: chromiumPath,

    headless: false // Puppeteer controlled browser should be visible
  });

  puppeteerPage = await puppeteerBrowser.newPage();

  await puppeteerPage.setViewport({ width: 1920, height: 1080 });

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

const doInsertItem = async (
  itemId: string,
  webContents: WebContents,
  chromiumPath: string,
  mobilePhone: string,
  callback: () => void
) => {
  puppeteerBrowser = await puppeteer.launch({
    executablePath: chromiumPath,
    defaultViewport: null,
    headless: false // Puppeteer controlled browser should be visible
  });

  puppeteerPage = await puppeteerBrowser.newPage();

  const item = getItem(itemId);
  if (!item) {
    console.error(`Item ${itemId} was not found`);
    callback();
    return;
  }

  puppeteerPage.on('close', () => {
    console.log('page was closed ');
    callback();
  });

  const cookies = getSettings().cookies;
  for (const cookie of cookies) {
    puppeteerPage.setCookie(cookie);
  }

  // Load a URL or website
  await puppeteerPage.goto(`https://inserimento.subito.it/?category=${item.category}&from=vendere`);
  webContents.send('log', 'Opened page');

  await puppeteerPage.waitForSelector('#title');

  const title = await puppeteerPage.$('#title');
  const description = await puppeteerPage.$('#description');
  const price = await puppeteerPage.$('#price');
  const location = await puppeteerPage.$('#location');
  const fileInput = (await puppeteerPage.$('#file-input')) as ElementHandle<HTMLInputElement>;
  const phone = await puppeteerPage.$('#phone');

  const conditionSelector = await puppeteerPage.$(
    '::-p-xpath(/html/body/div/div/main/div[2]/form/div/section[5]/div[2]/div)'
  );

  if (item.photos) {
    for (const picture of item.photos) {
      await fileInput.uploadFile(picture);
      await delay(ACTION_TIMEOUT);
    }
  }

  await title?.type(item.title);
  webContents.send('log', 'set title');
  await delay(ACTION_TIMEOUT);

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

  if (item.type) {
    const typeSelectorElement = await puppeteerPage.waitForSelector(
      '::-p-xpath(/html/body/div/div/main/div[2]/form/div/section[6]/div[2]/div)'
    );

    await typeSelectorElement?.click();
    await delay(ACTION_TIMEOUT);
    let typeSelector = 'computerType';

    switch (item.category) {
      case '10': {
        typeSelector = 'computerType';
        break;
      }
      case '11': {
        typeSelector = 'audioVideoType';
        break;
      }
      case '12': {
        typeSelector = 'phoneType';
        break;
      }
    }

    (await puppeteerPage.waitForSelector(`#${typeSelector}__option--${item.type}`))?.click();
    webContents.send('log', 'set type');
    await delay(ACTION_TIMEOUT);
  }

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

  phone?.type(mobilePhone);
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

  await puppeteerBrowser.close();
  callback();
};

const insertItems = withRunningCheck(
  async (callback: () => void, webContents: WebContents, itemIds: string[]) => {
    const appSettings = getAppSettings();

    if (!appSettings) {
      callback();
      return;
    }

    const { chromiumPath, mobilePhone } = appSettings;

    for (const itemId of itemIds) {
      await doInsertItem(itemId, webContents, chromiumPath, mobilePhone, callback);
    }
  }
);

const doRemoveItem = async (itemId, webContents, chromiumPath, callback) => {
  puppeteerBrowser = await puppeteer.launch({
    executablePath: chromiumPath,
    defaultViewport: null,
    headless: false // Puppeteer controlled browser should be visible
  });

  puppeteerPage = await puppeteerBrowser.newPage();

  const item = getItem(itemId);
  if (!item) {
    console.error(`Item ${itemId} was not found`);
    callback();
    return;
  }

  puppeteerPage.on('close', () => {
    console.log('page was closed ');
    callback();
  });

  const cookies = getSettings().cookies;
  for (const cookie of cookies) {
    puppeteerPage.setCookie(cookie);
  }

  // Load a URL or website
  await puppeteerPage.goto(`https://areariservata.subito.it/annunci`);
  webContents.send('log', 'Opened page');

  await puppeteerPage.waitForSelector('::-p-xpath(//span[text()="Seleziona annunci"])');

  const itemInPage = await puppeteerPage.waitForSelector(
    `::-p-xpath(//h2[text()="${item.title}"])`
  );

  if (!itemInPage) {
    callback();
    return;
  }

  webContents.send('log', `Item ${item.title} found in page`);

  const container = await itemInPage?.waitForSelector('::-p-xpath(.//ancestor::li)');

  const removeButton = await container?.waitForSelector('::-p-xpath(//span[text()="Elimina"])');

  await removeButton?.click();

  const reasonLabel = await puppeteerPage.waitForSelector(
    '::-p-xpath(/html/body/div[3]/div[2]/div/div/div[1]/div/div/label[3])'
  );

  await reasonLabel?.click();

  await delay(ACTION_TIMEOUT);

  const deleteButton = await puppeteerPage.waitForSelector(
    '::-p-xpath(/html/body/div[3]/div[2]/div/div/div[2]/button[2])'
  );

  deleteButton?.click();

  await delay(ACTION_TIMEOUT);

  webContents.send('log', 'Item removed');

  await puppeteerBrowser.close();
  callback();
};

const removeListings = withRunningCheck(
  async (callback: () => void, webContents: WebContents, itemIds: string[]) => {
    const appSettings = getAppSettings();

    if (!appSettings) {
      callback();
      return;
    }

    const { chromiumPath } = appSettings;

    for (const itemId of itemIds) {
      await doRemoveItem(itemId, webContents, chromiumPath, callback);
    }
  }
);
export { handleAuth, getAndStoreCookies, insertItems, removeListings };
