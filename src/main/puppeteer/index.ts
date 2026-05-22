import { WebContents, app } from 'electron';
import puppeteer, { Browser, ElementHandle, Page } from 'puppeteer-core';
import { getAppSettings, getSettings, storeCookies } from '../settings';
import { getItem, updateItem } from '../items';
import { AUTO_BRANDS, MOTO_BRANDS } from '../../renderer/src/pages/Item/carData';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

// Salva uno screenshot nella cartella appData/sellbot/screenshots
const saveErrorScreenshot = async (page: Page, label: string): Promise<void> => {
  try {
    const screenshotsDir = path.join(app.getPath('userData'), 'screenshots');
    if (!existsSync(screenshotsDir)) mkdirSync(screenshotsDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(screenshotsDir, `${label}_${timestamp}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`[Screenshot] salvato: ${filePath}`);
  } catch (err) {
    console.error('[Screenshot] errore salvataggio:', err);
  }
};

let isRunning = false;
let puppeteerBrowser: Browser;
let puppeteerPage: Page;

// Blocca il banner cookie di Subito (Didomi) intercettando le richieste di rete
// Va chiamata PRIMA del goto, così lo script non viene mai caricato
const blockCookieBanner = async (page: Page): Promise<void> => {
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('didomi.io') || url.includes('privacy-center.org') || url.includes('didomi')) {
      req.abort();
    } else {
      req.continue();
    }
  });
};

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
  await blockCookieBanner(puppeteerPage);

  // Load a URL or website
  await puppeteerPage.goto('https://subito.it');
  webContents.send('log', 'Opened page');

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
  location: string,
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
    await puppeteerBrowser.close();
    callback();
    return;
  }

  // --- VALIDAZIONE PRE-INSERIMENTO ---
  if (!item.title?.trim()) {
    webContents.send('log', 'ERROR: titolo mancante, inserimento annullato');
    await puppeteerBrowser.close();
    callback();
    return;
  }
  if (!item.description?.trim()) {
    webContents.send('log', 'ERROR: descrizione mancante, inserimento annullato');
    await puppeteerBrowser.close();
    callback();
    return;
  }
  if (!item.price || item.price <= 0) {
    webContents.send('log', 'ERROR: prezzo non valido, inserimento annullato');
    await puppeteerBrowser.close();
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

  await blockCookieBanner(puppeteerPage);
  // Load a URL or website
  await puppeteerPage.goto(`https://inserimento.subito.it/?category=${item.category}&from=vendere`);
  webContents.send('log', 'Opened page');

  // --- RILEVAMENTO COOKIE SCADUTI ---
  const currentUrl = puppeteerPage.url();
  if (currentUrl.includes('/login') || currentUrl.includes('/account') || currentUrl.includes('accedi')) {
    webContents.send('log', 'ERROR: cookie scaduti — effettua nuovamente il login dalle Impostazioni');
    await saveErrorScreenshot(puppeteerPage, 'cookie_scaduti');
    await puppeteerBrowser.close();
    callback();
    return;
  }

  // Wrapping principale per screenshot on error
  try {

  await puppeteerPage.waitForSelector('#title');

  const title = await puppeteerPage.$('#title');
  const description = await puppeteerPage.$('#description');
  const price = await puppeteerPage.$('#price');
  const fileInput = (await puppeteerPage.$('#file-input')) as ElementHandle<HTMLInputElement>;
  const phone = await puppeteerPage.$('#phone');



  if (item.photos) {
    const tempFiles: string[] = [];
    for (const picture of item.photos) {
      let filePath = picture;
      // Se è base64 (stringa lunga), scrivi su file temporaneo
      if (picture.length > 260) {
        const tmpPath = path.join(tmpdir(), `sellbot_${Date.now()}_${tempFiles.length}.jpg`);
        writeFileSync(tmpPath, Buffer.from(picture, 'base64'));
        tempFiles.push(tmpPath);
        filePath = tmpPath;
      }
      await fileInput.uploadFile(filePath);
      await delay(ACTION_TIMEOUT);
    }
    // Rimuovi i file temporanei
    for (const tmpFile of tempFiles) {
      try { unlinkSync(tmpFile); } catch { /* ignora */ }
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
  const isMotori = ['2', '3', '4', '22', '34'].includes(item.category);

  if (!isMotori) {
    // --- CONDITION (solo per Informatica e simili) ---

    // Seleziona un'opzione di dropdown per testo visibile (usa contains per match parziale)
    const clickDropdownByText = async (inputName: string, optionText: string, label: string) => {
      const container = await puppeteerPage.$(
        `::-p-xpath(//section[.//input[@name="${inputName}"]]//div[@tabindex="0"])`
      ) || await puppeteerPage.$(
        `::-p-xpath(//input[@name="${inputName}"]/parent::div/parent::div)`
      );
      if (container) {
        await container.click();
      }
      await delay(ACTION_TIMEOUT);
      // contains() invece di exact match: "Danneggiato" trova "Danneggiato - usato con parti guaste"
      const option = await puppeteerPage.$(
        `::-p-xpath(//ul[@role="listbox"]//li[contains(normalize-space(.), "${optionText}")])`
      ) || await puppeteerPage.$(
        `::-p-xpath(//div[@role="option"][contains(normalize-space(.), "${optionText}")])`
      );
      if (option) {
        await option.click();
        webContents.send('log', `set ${label}: ${optionText}`);
      } else {
        // Chiudi il dropdown per non interferire con i campi successivi
        await puppeteerPage.keyboard.press('Escape');
        webContents.send('log', `ERROR: option "${optionText}" not found for ${label}`);
      }
      await delay(ACTION_TIMEOUT);
    };

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

    // Mapping condition value → testo visibile su Subito
    const CONDITION_LABELS: Record<string, string> = {
      '0': 'Nuovo',
      '1': 'Come nuovo',
      '2': 'Ottimo',
      '3': 'Buono',
      '4': 'Danneggiato'
    };

    if (item.condition) {
      const condLabel = CONDITION_LABELS[item.condition] ?? '';
      await clickDropdownByText('itemCondition', condLabel, 'condition');
    }

    // Mappe valore→etichetta per i dropdown react-select delle categorie nuove.
    // Si clicca per testo (clickDropdownByText) come per la condizione.
    const TYPE_LABELS: Record<string, Record<string, string>> = {
      '16': { '1': 'Felpe e maglioni', '2': 'Giacche e giubbotti', '3': 'Gonne', '4': 'Pantaloni e jeans', '5': 'Scarpe', '6': 'Accessori', '7': 'T-shirt e camicie', '8': 'Intimo e pigiami', '9': 'Vestiti e completi', '10': 'Borse e zaini', '11': 'Altro', '12': 'Orologi e gioielli' },
      '17': { '1': 'Abbigliamento Bimbi', '2': "Prodotti per l'infanzia", '3': 'Giochi' },
      '20': { '1': 'Calcio', '2': 'Basket', '3': 'Volley', '4': 'Sci e Snowboard', '5': 'Ciclismo', '6': 'Acquatici', '7': 'Palestra', '8': 'Golf', '9': 'Motori', '10': 'Outdoor', '11': 'Altro' },
      '21': { '1': 'Francobolli', '2': 'Monete', '3': 'Cartoline', '4': 'Militaria', '5': 'Editoria', '6': 'Carte e Schede', '7': 'Altro', '8': 'Modellismo', '9': 'Modernariato', '10': 'Bambole' },
      '38': { '1': 'Libri scolastici e universitari', '2': 'Letteratura e Narrativa', '3': 'Gialli e Thriller', '4': 'Biografie', '5': 'Storia', '6': 'Cucina', '7': 'Fumetti', '8': 'Libri per bambini', '10': 'Altro' },
      '41': { '1': 'Uomo', '2': 'Donna', '3': 'Bimbo', '4': 'MTB e Touring', '5': 'Corsa', '6': 'Altre tipologie', '7': 'Pieghevoli', '8': 'BMX', '9': 'Scatto fisso e single speed', '10': 'Componenti e abbigliamento' }
    };
    const TYPE_INPUT_BY_CATEGORY: Record<string, string> = {
      '10': 'computerType', '11': 'audioVideoType', '12': 'phoneType',
      '16': 'clothingType', '17': 'childrenType', '20': 'sportType',
      '21': 'hobbyType', '38': 'bookType', '41': 'bicycleType'
    };

    if (item.type) {
      const typeInputName = TYPE_INPUT_BY_CATEGORY[item.category] || 'computerType';
      const labelMap = TYPE_LABELS[item.category];
      if (labelMap) {
        // Categorie nuove: react-select → clicco per testo
        const typeLabel = labelMap[item.type] ?? '';
        await clickDropdownByText(typeInputName, typeLabel, 'type');
      } else {
        // Categorie storiche (10/11/12): match per valore numerico
        await clickDropdownByInputName(typeInputName, item.type, 'type');
      }
    }

    // --- ABBIGLIAMENTO: genere (cat 16) ---
    if (item.category === '16' && item.clothingGender) {
      const GENDER_LABELS: Record<string, string> = { '1': 'Uomo', '2': 'Donna', '3': 'Unisex' };
      await clickDropdownByText('clothingGender', GENDER_LABELS[item.clothingGender] ?? '', 'clothingGender');
    }

    // --- TUTTO PER I BAMBINI: fascia d'età (cat 17) ---
    if (item.category === '17' && item.childrenAge) {
      const AGE_LABELS: Record<string, string> = { '1': '0 - 12 mesi', '2': '1 - 3 anni', '3': '3 - 6 anni', '4': '6 - 12 anni', '5': 'Per tutte le età' };
      await clickDropdownByText('childrenAge', AGE_LABELS[item.childrenAge] ?? '', 'childrenAge');
    }
  } else {
    // --- MOTORI: Marca, Chilometraggio, Anno, Mese ---
    if (item.brand) {
      const brandInput = await puppeteerPage.$('#react-select-2-input');
      await brandInput?.click();
      await delay(500);
      const allBrands = [...AUTO_BRANDS, ...MOTO_BRANDS];
      const brandLabel = allBrands.find(b => b.value === item.brand)?.label || item.brand;
      await brandInput?.type(brandLabel);
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

    // Log tutti i react-select per debug (aiuta a capire la struttura del form)
    await delay(500);
    const allSelectInfo = await puppeteerPage.evaluate(() => {
      return Array.from(document.querySelectorAll('[id*="react-select"][id$="-input"]')).map(el => {
        const container = el.closest('[class*="container"]');
        const placeholder = container?.querySelector('[class*="placeholder"]')?.textContent || '';
        const value = container?.querySelector('[class*="singleValue"]')?.textContent || '';
        return `${el.id} (placeholder="${placeholder}" value="${value}")`;
      });
    });
    webContents.send('log', `React-selects: ${allSelectInfo.join(' | ')}`);

    if (item.model) {
      // Trova il select del modello: cerca per placeholder che contiene "model" / "Modello"
      // oppure usa il secondo react-select della pagina (dopo brand)
      const modelInput = await puppeteerPage.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('[id*="react-select"][id$="-input"]'));
        // Prima prova: trova per placeholder "Modello"
        const byPlaceholder = inputs.find(el => {
          const container = el.closest('[class*="container"]');
          const ph = container?.querySelector('[class*="placeholder"]')?.textContent?.toLowerCase() || '';
          return ph.includes('model') || ph.includes('modello');
        });
        if (byPlaceholder) return byPlaceholder.id;
        // Fallback: il secondo input (index 1) — brand è sempre il primo
        return inputs[1]?.id || null;
      });

      if (modelInput) {
        webContents.send('log', `model select id: ${modelInput}`);
        const input = await puppeteerPage.$(`#${modelInput}`);
        if (input) {
          await input.click();
          await delay(500);
          await input.type(item.model);
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
      } else {
        webContents.send('log', 'ERROR: model input not found');
      }
    }

    if (item.trim) {
      // Trova il select del trim: cerca per placeholder "Versione" / "Allestimento"
      // oppure usa il terzo react-select della pagina
      const trimInput = await puppeteerPage.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('[id*="react-select"][id$="-input"]'));
        const byPlaceholder = inputs.find(el => {
          const container = el.closest('[class*="container"]');
          const ph = container?.querySelector('[class*="placeholder"]')?.textContent?.toLowerCase() || '';
          return ph.includes('versione') || ph.includes('allestimento') || ph.includes('trim');
        });
        if (byPlaceholder) return byPlaceholder.id;
        return inputs[2]?.id || null;
      });

      if (trimInput) {
        webContents.send('log', `trim select id: ${trimInput}`);
        const input = await puppeteerPage.$(`#${trimInput}`);
        if (input) {
          await input.click();
          await delay(500);
          await input.type(item.trim);
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
      } else {
        webContents.send('log', 'WARNING: trim input not found');
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

  // --- LOCATION (con retry) ---
  let locationSet = false;
  for (let attempt = 0; attempt < 2 && !locationSet; attempt++) {
    if (attempt > 0) {
      webContents.send('log', 'WARNING: location retry...');
      await delay(1500);
    }
    const locationInput = await puppeteerPage.$('#location');
    if (!locationInput) continue;
    await locationInput.click();
    await delay(300);
    await puppeteerPage.keyboard.down('Control');
    await puppeteerPage.keyboard.press('a');
    await puppeteerPage.keyboard.up('Control');
    await puppeteerPage.keyboard.press('Backspace');
    await delay(300);
    await locationInput.type(location, { delay: 100 });
    await delay(2500);
    const locationOption = await puppeteerPage.waitForSelector(
      '#autocomplete-location-item-0, [id^="autocomplete-location-item"], [class*="autocomplete"] li:first-child',
      { timeout: 5000 }
    ).catch(() => null);
    if (locationOption) {
      await locationOption.click();
      webContents.send('log', 'set location (click)');
      locationSet = true;
    } else {
      await puppeteerPage.keyboard.press('ArrowDown');
      await delay(300);
      await puppeteerPage.keyboard.press('Enter');
      webContents.send('log', 'set location (keyboard)');
      locationSet = true;
    }
  }
  if (!locationSet) webContents.send('log', 'WARNING: location non impostata');
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
  await delay(ACTION_TIMEOUT * 3);

  // --- PUBLISH ---
  const publishButton = await puppeteerPage.waitForSelector(
    '[data-testid="publish-button"], button[class*="publish"], ::-p-xpath(//button[contains(text(),"Pubblica") or contains(text(),"pubblica")])',
    { timeout: 20000 }
  ).catch(() => null);
  if (!publishButton) {
    throw new Error('publish button not found');
  }
  await publishButton.click();
  webContents.send('log', 'publish');
  // Segna come online subito dopo aver cliccato Pubblica
  const publishedItem = getItem(itemId);
  if (publishedItem) updateItem({ ...publishedItem, isOnline: true });
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

  webContents.send('log', 'placement complete');

  } catch (err) {
    // --- SCREENSHOT ON ERROR ---
    webContents.send('log', `ERROR: inserimento fallito — ${err}`);
    try {
      await saveErrorScreenshot(puppeteerPage, `insert_${itemId}`);
      webContents.send('log', `Screenshot salvato in AppData/sellbot/screenshots`);
    } catch { /* ignora errore screenshot */ }
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

    const { chromiumPath, mobilePhone, location } = appSettings;

    for (const itemId of itemIds) {
      await doInsertItem(itemId, webContents, chromiumPath, mobilePhone, location ?? '', callback);
    }
  }
);

const doRemoveItemInternal = async (
  itemId: string,
  webContents: WebContents,
  chromiumPath: string
): Promise<boolean> => {
  const item = getItem(itemId);
  if (!item) {
    console.error(`Item ${itemId} was not found`);
    return false;
  }

  const browser = await puppeteer.launch({
    executablePath: chromiumPath,
    defaultViewport: null,
    headless: false
  });

  const page = await browser.newPage();

  try {
    const cookies = getSettings().cookies;
    for (const cookie of cookies) {
      page.setCookie(cookie);
    }

    await blockCookieBanner(page);
    await page.goto('https://areariservata.subito.it/annunci', { waitUntil: 'domcontentloaded' });
    console.log(`[Remove] Cerco annuncio: ${item.title}`);
    webContents.send('log', `Cerco annuncio: ${item.title}`);
    await delay(3000); // Attendo rendering dinamico

    // Trova e clicca il bottone "Elimina" nel <li> che contiene il titolo dell'annuncio
    // Usa i primi 40 caratteri del titolo per evitare problemi di troncamento
    const jsClicked = await page.evaluate((title) => {
      const shortTitle = title.substring(0, 40);
      const listItems = document.querySelectorAll('li');
      for (const li of listItems) {
        const hasTitle = Array.from(li.querySelectorAll('h2, h3, button, span')).some(
          (el) => el.childElementCount === 0 && el.textContent?.includes(shortTitle)
        );
        if (hasTitle) {
          const buttons = li.querySelectorAll('button');
          for (const btn of buttons) {
            if (btn.textContent?.trim() === 'Elimina') {
              (btn as HTMLElement).scrollIntoView();
              btn.click();
              return 'clicked';
            }
          }
          return 'li trovato ma Elimina non trovato';
        }
      }
      return 'li con titolo non trovato';
    }, item.title);

    console.log(`[Remove] JS click Elimina: ${jsClicked}`);
    webContents.send('log', `Elimina: ${jsClicked}`);

    if (jsClicked !== 'clicked') {
      console.log(`[Remove] ERROR: ${jsClicked}`);
      webContents.send('log', `ERROR: ${jsClicked}`);
      return false;
    }
    console.log('[Remove] Cliccato Elimina, attendo modal...');
    webContents.send('log', 'Cliccato Elimina, attendo modal...');
    await delay(ACTION_TIMEOUT * 2);

    // Modal di conferma
    const modal = await page.waitForSelector(
      '[role="dialog"], [class*="Modal__"], [class*="modal__"], [class*="Dialog__"]',
      { timeout: 8000 }
    ).catch(() => null);

    console.log(`[Remove] modal trovato: ${!!modal}`);

    if (modal) {
      webContents.send('log', 'Modal trovato');

      // Prima seleziona il motivo tramite puppeteer (click reale, non JS)
      const reasonBtn = await page.waitForSelector(
        '::-p-xpath(//label[contains(translate(., "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "non venduto")])',
        { visible: true, timeout: 5000 }
      ).catch(() => null);
      if (reasonBtn) {
        await reasonBtn.click();
        console.log('[Remove] Motivo selezionato via puppeteer click');
        webContents.send('log', 'Motivo selezionato');
        await delay(500);
      }

      // Clicca il bottone Elimina del modal (l'ultimo visibile nella pagina)
      // Usa puppeteer .click() reale per triggerare gli eventi React
      const allEliminaBtns = await page.$$('::-p-xpath(//button[normalize-space(.)="Elimina"])');
      console.log(`[Remove] Bottoni Elimina trovati: ${allEliminaBtns.length}`);
      if (allEliminaBtns.length > 0) {
        const confirmBtn = allEliminaBtns[allEliminaBtns.length - 1];
        await confirmBtn.scrollIntoView();
        await delay(300);
        await confirmBtn.click();
        await delay(ACTION_TIMEOUT * 2);
        console.log(`[Remove] "${item.title}" eliminato con successo`);
        webContents.send('log', `"${item.title}" eliminato con successo`);
        updateItem({ ...item, isOnline: false });
      } else {
        console.log('[Remove] ERROR: bottone conferma Elimina non trovato');
        webContents.send('log', 'ERROR: bottone conferma non trovato');
      }
    } else {
      console.log('[Remove] WARNING: modal non apparso dopo click Elimina');
      webContents.send('log', 'WARNING: modal non apparso dopo click Elimina');
    }
  } catch (err) {
    console.error('[doRemoveItemInternal]', err);
    webContents.send('log', `Errore eliminazione: ${err}`);
  } finally {
    await browser.close();
  }

  return true;
};

// Controlla quali annunci sono ancora online; ritorna gli itemId ancora presenti
const checkItemsOnline = async (
  itemIds: string[],
  webContents: WebContents,
  chromiumPath: string
): Promise<string[]> => {
  const browser = await puppeteer.launch({
    executablePath: chromiumPath,
    defaultViewport: null,
    headless: false
  });

  const page = await browser.newPage();
  const cookies = getSettings().cookies;
  for (const cookie of cookies) {
    page.setCookie(cookie);
  }

  await blockCookieBanner(page);
  await page.goto('https://areariservata.subito.it/annunci', { waitUntil: 'networkidle2' });
  await page.waitForSelector('::-p-xpath(//span[text()="Seleziona annunci"] | //div[contains(@class,"AdList")])', { timeout: 15000 }).catch(() => null);

  // Scorri la pagina fino in fondo per caricare tutti gli annunci (infinite scroll / lazy load)
  let prevHeight = 0;
  for (let i = 0; i < 20; i++) {
    const currHeight: number = await page.evaluate(() => document.body.scrollHeight);
    if (currHeight === prevHeight) break;
    prevHeight = currHeight;
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise((r) => setTimeout(r, 1500));
  }

  // Raccogli tutti i titoli visibili nella pagina
  const pageTitles: string[] = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('h2, h3, [class*="title"], [class*="Title"]'));
    return els.map((el) => el.textContent?.trim() || '').filter(Boolean);
  });

  // Similarità Jaccard: conta parole in comune / parole totali uniche
  const jaccardSimilarity = (a: string, b: string): number => {
    const wordsA = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 1));
    const wordsB = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 1));
    const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
    const union = new Set([...wordsA, ...wordsB]).size;
    return union === 0 ? 0 : intersection / union;
  };

  const MATCH_THRESHOLD = 0.75;

  const stillOnline: string[] = [];
  for (const itemId of itemIds) {
    const item = getItem(itemId);
    if (!item) continue;
    const bestScore = Math.max(...pageTitles.map((t) => jaccardSimilarity(item.title, t)), 0);
    if (bestScore >= MATCH_THRESHOLD) {
      stillOnline.push(itemId);
      webContents.send('log', `Annuncio "${item.title}" ancora online (match ${(bestScore * 100).toFixed(0)}%)`);
    } else {
      webContents.send('log', `Annuncio "${item.title}" non trovato (offline, max match ${(bestScore * 100).toFixed(0)}%)`);
    }
  }

  await browser.close();
  return stillOnline;
};
// @ts-ignore
const doRemoveItem = async (itemId, webContents, chromiumPath, callback) => {
  await doRemoveItemInternal(itemId, webContents, chromiumPath);
  callback();
};

const removeListings = withRunningCheck(
  async (callback: () => void, webContents: WebContents, itemIds: string[]) => {
    const appSettings = getAppSettings();
    if (!appSettings) { callback(); return; }
    const { chromiumPath } = appSettings;
    for (const itemId of itemIds) {
      await doRemoveItemInternal(itemId, webContents, chromiumPath);
    }
    callback();
  }
);

// Funzione per lo scheduler: cancella, verifica, poi pubblica
const removeAndInsertItems = withRunningCheck(
  async (callback: () => void, webContents: WebContents, itemIds: string[]) => {
    const appSettings = getAppSettings();
    if (!appSettings) { callback(); return; }
    const { chromiumPath, mobilePhone, location } = appSettings;

    // Step 1: cancella tutti gli annunci, traccia quali erano online
    webContents.send('log', '[Scheduler] Cancellazione annunci in corso...');
    let anyDeleted = false;
    for (const itemId of itemIds) {
      const wasOnline = await doRemoveItemInternal(itemId, webContents, chromiumPath);
      if (wasOnline) anyDeleted = true;
    }

    // Step 2: se almeno uno era online, attendi 5 minuti per la propagazione
    if (anyDeleted) {
      const WAIT_AFTER_DELETE = 5 * 60 * 1000;
      webContents.send('log', '[Scheduler] Attendo 5 minuti per la propagazione della cancellazione...');
      await delay(WAIT_AFTER_DELETE);
    } else {
      webContents.send('log', '[Scheduler] Nessun annuncio trovato online, procedo subito con la pubblicazione...');
    }

    // Step 3: pubblica tutti gli annunci
    webContents.send('log', '[Scheduler] Pubblicazione annunci...');
    for (const itemId of itemIds) {
      await doInsertItem(itemId, webContents, chromiumPath, mobilePhone, location ?? '', () => {});
    }

    webContents.send('log', '[Scheduler] Completato.');
    callback();
  }
);

const fetchItemsStats = async (
  itemIds: string[],
  webContents: WebContents,
  chromiumPath: string
): Promise<Record<string, { position?: string; views?: number; messages?: number; lastChecked: string }>> => {
  const browser = await puppeteer.launch({
    executablePath: chromiumPath,
    defaultViewport: null,
    headless: false
  });

  const page = await browser.newPage();
  const cookies = getSettings().cookies;
  for (const cookie of cookies) page.setCookie(cookie);

  await blockCookieBanner(page);
  await page.goto('https://areariservata.subito.it/annunci', { waitUntil: 'domcontentloaded' });
  webContents.send('log', 'Caricamento pagina annunci...');
  await delay(3000);

  // Scroll per caricare tutti gli annunci (lazy load)
  let prevHeight = 0;
  for (let i = 0; i < 20; i++) {
    const currHeight: number = await page.evaluate(() => document.body.scrollHeight);
    if (currHeight === prevHeight) break;
    prevHeight = currHeight;
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise((r) => setTimeout(r, 1500));
  }

  const result: Record<string, { position?: string; views?: number; messages?: number; lastChecked: string }> = {};
  const now = new Date().toISOString();

  // Raccogli TUTTE le listing dalla pagina in un'unica evaluate
  type ListingData = { title: string; position?: string; views?: number; messages?: number };
  const allListings: ListingData[] = await page.evaluate(() => {
    const listings: { title: string; position?: string; views?: number; messages?: number }[] = [];
    const listItems = document.querySelectorAll('li');
    for (const li of listItems) {
      // Cerca il titolo: prova prima h2/h3, poi p, a, span con testo abbastanza lungo
      let title = '';
      const candidates = Array.from(li.querySelectorAll('h2, h3, p, a, span'));
      for (const el of candidates) {
        if (el.childElementCount !== 0) continue;
        const text = el.textContent?.trim() || '';
        if (text.length > 5 && text.length < 200) { title = text; break; }
      }
      if (!title) continue;

      let position: string | undefined;
      let views: number | undefined;
      let messages: number | undefined;
      li.querySelectorAll('[title]').forEach((el) => {
        const t = el.getAttribute('title') || '';
        if (t.includes('pagina')) position = t.replace('pagina', '').trim();
        else if (t.includes('visit')) views = parseInt(t) || 0;
        else if (t.includes('messagg')) messages = parseInt(t) || 0;
      });

      // Includi la listing anche senza stats (annuncio recente senza dati ancora)
      listings.push({ title, position, views, messages });
    }
    return listings;
  });

  webContents.send('log', `[Stats] Trovate ${allListings.length} listing — esempi: ${allListings.slice(0, 3).map(l => `"${l.title.substring(0, 30)}"`).join(', ')}`);

  // Similarità Jaccard: conta parole in comune / parole totali uniche
  const jaccardSim = (a: string, b: string): number => {
    const wA = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 1));
    const wB = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 1));
    const intersection = [...wA].filter((w) => wB.has(w)).length;
    const union = new Set([...wA, ...wB]).size;
    return union === 0 ? 0 : intersection / union;
  };

  const MATCH_THRESHOLD = 0.75;

  for (const itemId of itemIds) {
    const item = getItem(itemId);
    if (!item) continue;

    let bestListing: ListingData | null = null;
    let bestScore = 0;
    for (const listing of allListings) {
      const score = jaccardSim(item.title, listing.title);
      if (score > bestScore) { bestScore = score; bestListing = listing; }
    }

    if (bestListing && bestScore >= MATCH_THRESHOLD) {
      result[itemId] = { position: bestListing.position, views: bestListing.views, messages: bestListing.messages, lastChecked: now };
      webContents.send('log', `Stats "${item.title}": pagina ${bestListing.position ?? '?'}, ${bestListing.views ?? 0} visite, ${bestListing.messages ?? 0} messaggi (match ${(bestScore * 100).toFixed(0)}%)`);
    } else {
      webContents.send('log', `Stats "${item.title}": annuncio non trovato (max match ${(bestScore * 100).toFixed(0)}%)`);
    }
  }

  await browser.close();
  return result;
};

export { handleAuth, getAndStoreCookies, insertItems, removeListings, removeAndInsertItems, checkItemsOnline, fetchItemsStats };


