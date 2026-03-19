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

  // --- CAMPI SPECIFICI PER CATEGORIA ---
  const isMotori = ['2', '3', '4', '5', '22', '34', '36'].includes(item.category);

  if (!isMotori) {
    // --- CONDITION (solo per Informatica e simili) ---
    const clickDropdownByInputName = async (inputName: string, optionValue: string, label: string) => {
      const dropdownContainer = await puppeteerPage.$(
        `::-p-xpath(//input[@name="${inputName}"]/following-sibling::div | //input[@name="${inputName}"]/../div[@tabindex])`
      ) || await puppeteerPage.$(
        `::-p-xpath(//input[@name="${inputName}"]/parent::div/parent::div)`
      );
      if (dropdownContainer) {
        await dropdownContainer.click();
      } else {
        const placeholderDiv = await puppeteerPage.$(
          `::-p-xpath(//section[.//input[@name="${inputName}"]]//div[@tabindex="0"])`
        );
        await placeholderDiv?.click();
      }
      await delay(ACTION_TIMEOUT);
      const option = await puppeteerPage.$(`#${inputName}__option--${optionValue}`) ||
        await puppeteerPage.$(`[id="${inputName}__option--${optionValue}"]`) ||
        await puppeteerPage.$(`::-p-xpath(//ul[@role="listbox"]//li[@data-value="${optionValue}"])`);
      if (option) {
        await option.click();
        webContents.send('log', `set ${label}`);
      } else {
        webContents.send('log', `ERROR: option ${optionValue} not found for ${label}`);
      }
      await delay(ACTION_TIMEOUT);
    };

    if (item.condition) {
      await clickDropdownByInputName('itemCondition', item.condition, 'condition');
    }

    if (item.type) {
      let typeInputName = 'computerType';
      switch (item.category) {
        case '10': typeInputName = 'computerType'; break;
        case '11': typeInputName = 'audioVideoType'; break;
        case '12': typeInputName = 'phoneType'; break;
      }
      await clickDropdownByInputName(typeInputName, item.type, 'type');
    }
  } else {
    // --- MOTORI: Marca, Chilometraggio, Anno, Mese ---
    if (item.brand) {
      const brandInput = await puppeteerPage.$('#react-select-2-input');
      await brandInput?.click();
      await delay(500);
      await brandInput?.type(item.brand);
      await delay(1000);
      const brandOption = await puppeteerPage.waitForSelector(
        '[class*="option__"]', { timeout: 5000 }
      ).catch(() => null);
      if (brandOption) {
        await brandOption.click();
        webContents.send('log', 'set brand');
      } else {
        webContents.send('log', 'ERROR: brand option not found');
      }
      await delay(ACTION_TIMEOUT);
    }

    if (item.model) {
      // Il react-select del modello appare dopo aver selezionato la marca
      const modelInput = await puppeteerPage.waitForSelector(
        '#react-select-12-input', { timeout: 5000 }
      ).catch(() => null);
      await modelInput?.click();
      await delay(500);
      await modelInput?.type(item.model);
      await delay(1000);
      const modelOption = await puppeteerPage.waitForSelector(
        '[class*="option__"]', { timeout: 5000 }
      ).catch(() => null);
      if (modelOption) {
        await modelOption.click();
        webContents.send('log', 'set model');
      } else {
        webContents.send('log', 'ERROR: model option not found');
      }
      await delay(ACTION_TIMEOUT);
    }
    if (item.trim) {
      const trimInput = await puppeteerPage.waitForSelector(
        '#react-select-13-input', { timeout: 5000 }
      ).catch(() => null);
      if (trimInput) {
        await trimInput.click();
        await delay(500);
        await trimInput.type(item.trim);
        await delay(1000);
        const trimOption = await puppeteerPage.waitForSelector(
          '[class*="option__"]', { timeout: 5000 }
        ).catch(() => null);
        if (trimOption) {
          await trimOption.click();
          webContents.send('log', 'set trim');
        } else {
          webContents.send('log', 'WARNING: trim option not found');
        }
        await delay(ACTION_TIMEOUT);
      }
    }
    if (item.mileage) {
      await puppeteerPage.waitForSelector('#mileage', { timeout: 5000 });
      const mileageInput = await puppeteerPage.$('#mileage');
      await mileageInput?.click();
      await mileageInput?.type(item.mileage);
      webContents.send('log', 'set mileage');
      await delay(ACTION_TIMEOUT);
    }

    if (item.year) {
      const yearInput = await puppeteerPage.$('#react-select-3-input');
      await yearInput?.click();
      await delay(500);
      await yearInput?.type(item.year);
      await delay(1000);
      const yearOption = await puppeteerPage.waitForSelector(
        '[class*="option__"]', { timeout: 5000 }
      ).catch(() => null);
      if (yearOption) {
        await yearOption.click();
        webContents.send('log', 'set year');
      } else {
        webContents.send('log', 'ERROR: year option not found');
      }
      await delay(ACTION_TIMEOUT);
    }

    if (item.month) {
      const monthInput = await puppeteerPage.$('#react-select-4-input');
      await monthInput?.click();
      await delay(500);
      await monthInput?.type(item.month);
      await delay(1000);
      const monthOption = await puppeteerPage.waitForSelector(
        '[class*="option__"]', { timeout: 5000 }
      ).catch(() => null);
      if (monthOption) {
        await monthOption.click();
        webContents.send('log', 'set month');
      } else {
        webContents.send('log', 'ERROR: month option not found');
      }
      await delay(ACTION_TIMEOUT);
    }
  }

  // --- LOCATION ---
  await location?.click();
  await delay(500);
  await location?.type('Cosenza');
  await delay(2000);
  const locationOption = await puppeteerPage.waitForSelector('#autocomplete-location-item-0', { timeout: 10000 }).catch(() => null);
  if (locationOption) { await locationOption.click(); } else { webContents.send('log', 'ERROR: location autocomplete not found'); }
  webContents.send('log', 'set location');
  await delay(ACTION_TIMEOUT);

  // --- PRICE ---
  await price?.type(`${item.price}`);
  webContents.send('log', 'set price');
  await delay(ACTION_TIMEOUT);

  // --- DIMENSION ---
  if (item.dimension) {
    await delay(2000);
    await puppeteerPage.evaluate((dim) => {
      const radios = document.querySelectorAll('input[name="itemShippingPackageSize"]');
      const radio = radios[Number(dim) - 1] as HTMLElement;
      if (radio) {
        radio.click();
        radio.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, item.dimension);
    webContents.send('log', 'set dimension');
    await delay(ACTION_TIMEOUT);
  }

  // --- PHONE ---
  phone?.type(mobilePhone);
  webContents.send('log', 'set mobile phone');
  await delay(ACTION_TIMEOUT);

  // --- SUBMIT ---
  await puppeteerPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await delay(1000);
  const submitButton = await puppeteerPage.waitForSelector(
    '::-p-xpath(//button[contains(text(),"Continua")])',
    { timeout: 10000 }
  ).catch(() => null);
  if (submitButton) {
    await submitButton.click();
    webContents.send('log', 'submit');
  } else {
    webContents.send('log', 'ERROR: continua button not found');
  }
  await delay(ACTION_TIMEOUT * 2);

  // --- PUBLISH ---
  const publishButton = await puppeteerPage.waitForSelector(
    '[data-testid="publish-button"], button[class*="publish"], ::-p-xpath(//button[contains(text(),"Pubblica") or contains(text(),"pubblica")])',
    { timeout: 10000 }
  );
  await publishButton?.click();
  webContents.send('log', 'publish');
  await delay(ACTION_TIMEOUT);

  // --- SKIP VISIBILITY UPSELL ---
  try {
    const skipVisibilityButton = await puppeteerPage.waitForSelector(
      '::-p-xpath(//button[contains(text(),"Salta") or contains(text(),"salta") or contains(text(),"Skip") or contains(text(),"Non ora")])',
      { timeout: 5000 }
    );
    await skipVisibilityButton?.click();
    webContents.send('log', 'skip visibility');
    await delay(ACTION_TIMEOUT);
  } catch {
    webContents.send('log', 'no visibility upsell found, continuing');
  }

  // --- THANK YOU PAGE ---
  const thankYouPage = await puppeteerPage.waitForSelector(
    '::-p-xpath(//*[contains(@class,"thank") or contains(@class,"success") or contains(@class,"complete")] | //h1[contains(text(),"Grazie") or contains(text(),"grazie") or contains(text(),"inserito")])',
    { timeout: 10000 }
  ).catch(() => null);

  if (thankYouPage && await thankYouPage?.isVisible()) {
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


