import { BrowserWindow, ipcMain, shell, dialog, Notification } from 'electron';
import { handleAuth, getAndStoreCookies, insertItems, removeListings, removeAndInsertItems, checkItemsOnline, fetchItemsStats, requestCancel, isBusy } from '../puppeteer';
import { getAppSettings, storeSettings, getSettings } from '../settings';
import {
  getItems,
  getItem,
  getItemWithEncodedPics,
  updateItem,
  getItemsWithEncodedPics,
  cloneItem,
  deleteItem,
  getTrashItems,
  restoreItem,
  permanentlyDeleteItem
} from '../items';
import { AppSettings, Item, Schedule } from '../../shared/types';
import { net } from 'electron';
import { getSchedules, saveSchedules, getSchedulerState, saveSchedulerState } from '../schedules';
import AdmZip from 'adm-zip';
import { writeFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { log } from '../logger';
import * as cheerio from 'cheerio';

const IPC_CHANNELS = {
  EXPORT_ITEMS: 'EXPORT_ITEMS',
  IMPORT_ITEMS: 'IMPORT_ITEMS',
  PUPPETEER_OPEN_LOGIN_PAGE: 'PUPPETEER_OPEN_LOGIN_PAGE',
  PUPPETEER_STORE_COOKIES: 'PUPPETEER_STORE_COOKIES',
  GET_SETTINGS: 'GET_SETTINGS',
  STORE_SETTINGS: 'STORE_SETTINGS',
  GET_ITEMS: 'GET_ITEMS',
  GET_ITEM: 'GET_ITEM',
  INSERT_ITEMS: 'INSERT_ITEMS',
  UPDATE_ITEM: 'UPDATE_ITEM',
  CLONE_ITEM: 'CLONE_ITEM',
  DELETE_ITEM: 'DELETE_ITEM',
  REMOVE_LISTINGS: 'REMOVE_LISTINGS',
  GET_COOKIES: 'GET_COOKIES',
  FETCH_VEHICLE_CONFIG: 'FETCH_VEHICLE_CONFIG',
  GET_ANTHROPIC_KEY: 'GET_ANTHROPIC_KEY',
  GENERATE_DESCRIPTION: 'GENERATE_DESCRIPTION',
  GET_SCHEDULES: 'GET_SCHEDULES',
  SAVE_SCHEDULE: 'SAVE_SCHEDULE',
  DELETE_SCHEDULE: 'DELETE_SCHEDULE',
  CHECK_ITEMS_STATUS: 'CHECK_ITEMS_STATUS',
  FETCH_PRICE_RANGE: 'FETCH_PRICE_RANGE',
  OPEN_EXTERNAL: 'OPEN_EXTERNAL',
  FETCH_ITEMS_STATS: 'FETCH_ITEMS_STATS',
  UPDATE_SCHEDULE: 'UPDATE_SCHEDULE',
  GET_TRASH: 'GET_TRASH',
  RESTORE_ITEM: 'RESTORE_ITEM',
  PERMANENTLY_DELETE_ITEM: 'PERMANENTLY_DELETE_ITEM',
  EXTRACT_PRODUCT_INFO: 'EXTRACT_PRODUCT_INFO',
  SEARCH_EAN_BY_TITLE: 'SEARCH_EAN_BY_TITLE',
  LOOKUP_EAN_PRODUCT: 'LOOKUP_EAN_PRODUCT',
  RUN_SCHEDULE_NOW: 'RUN_SCHEDULE_NOW',
  CANCEL_OPERATION: 'CANCEL_OPERATION',
  IS_BUSY: 'IS_BUSY',
};

export type ProductInfo = {
  cleanQuery: string;
  productName: string;
  keySpecs: string[];
};

// Helper: wrappa una net.request con timeout (default 30s)
const HTTP_TIMEOUT_MS = 30000;

const callGroqOnce = (
  apiKey: string,
  messages: { role: string; content: string }[],
  maxTokens: number
): Promise<{ status: number; body: string } | null> => {
  return new Promise((resolve) => {
    const body = JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: maxTokens });
    const request = net.request({ method: 'POST', url: 'https://api.groq.com/openai/v1/chat/completions' });
    request.setHeader('Content-Type', 'application/json');
    request.setHeader('Authorization', `Bearer ${apiKey}`);
    let responseBody = '';
    let status = 0;
    let settled = false;
    const finish = (r: { status: number; body: string } | null) => { if (!settled) { settled = true; resolve(r); } };
    const timer = setTimeout(() => { try { request.abort(); } catch {} finish(null); }, HTTP_TIMEOUT_MS);
    request.on('response', (response) => {
      status = response.statusCode;
      response.on('data', (chunk) => { responseBody += chunk.toString(); });
      response.on('end', () => { clearTimeout(timer); finish({ status, body: responseBody }); });
    });
    request.on('error', () => { clearTimeout(timer); finish(null); });
    request.write(body);
    request.end();
  });
};

const callGroq = async (apiKey: string, messages: { role: string; content: string }[], maxTokens = 512): Promise<string | null> => {
  // Retry su 429 (rate limit) e 5xx con backoff esponenziale: 1s, 3s, 7s
  const backoffs = [0, 1000, 3000, 7000];
  for (let i = 0; i < backoffs.length; i++) {
    if (backoffs[i] > 0) await new Promise((r) => setTimeout(r, backoffs[i]));
    const res = await callGroqOnce(apiKey, messages, maxTokens);
    if (!res) continue; // timeout / errore di rete → retry
    if (res.status >= 200 && res.status < 300) {
      try { return JSON.parse(res.body).choices?.[0]?.message?.content || null; }
      catch { return null; }
    }
    if (res.status === 429 || res.status >= 500) {
      console.log(`[callGroq] status ${res.status}, retry ${i + 1}/${backoffs.length}`);
      continue; // retry
    }
    // 4xx (auth, bad request) — non retry
    console.log(`[callGroq] errore ${res.status}: ${res.body.substring(0, 200)}`);
    return null;
  }
  return null;
};

const searchSubitoAds = (cleanQuery: string, cookieHeader: string, limit = 10): Promise<any[]> => {
  return new Promise((resolve) => {
    const url = `https://hades.subito.it/v1/search/items?q=${encodeURIComponent(cleanQuery)}&lim=${limit}`;
    const req = net.request({ method: 'GET', url });
    req.setHeader('Accept', 'application/json');
    req.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    req.setHeader('Origin', 'https://www.subito.it');
    req.setHeader('Referer', 'https://www.subito.it/');
    if (cookieHeader) req.setHeader('Cookie', cookieHeader);
    let body = '';
    let settled = false;
    const finish = (r: any[]) => { if (!settled) { settled = true; resolve(r); } };
    const timer = setTimeout(() => { try { req.abort(); } catch {} finish([]); }, HTTP_TIMEOUT_MS);
    req.on('response', (response) => {
      response.on('data', (chunk) => { body += chunk.toString(); });
      response.on('end', () => {
        clearTimeout(timer);
        try { finish(JSON.parse(body)?.ads || []); } catch { finish([]); }
      });
    });
    req.on('error', () => { clearTimeout(timer); finish([]); });
    req.end();
  });
};

const extractCleanQuery = async (title: string, apiKey: string): Promise<{ cleanQuery: string; productName: string }> => {
  const prompt = `Titolo annuncio: "${title}"
Identifica il prodotto esatto. Rispondi SOLO con JSON:
{"cleanQuery": "marca + modello COMPLETO (mantieni SEMPRE il numero di modello, es. 'AMD Ryzen 9 7900X', 'iPhone 14 Pro'. Rimuovi solo parole generiche: usato/vendo/ottimo/processore/smartphone)", "productName": "nome commerciale completo"}`;

  const raw = await callGroq(apiKey, [
    { role: 'system', content: 'Rispondi SOLO con JSON valido, senza testo aggiuntivo.' },
    { role: 'user', content: prompt }
  ], 150);

  if (raw) {
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.cleanQuery) return { cleanQuery: parsed.cleanQuery, productName: parsed.productName || title };
      }
    } catch { /* usa default */ }
  }
  return { cleanQuery: title, productName: title };
};

const searchDuckDuckGo = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const req = net.request({ method: 'GET', url });
    req.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    req.setHeader('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
    req.setHeader('Accept-Language', 'it-IT,it;q=0.9,en;q=0.8');
    let body = '';
    let settled = false;
    const finish = (r: string) => { if (!settled) { settled = true; resolve(r); } };
    const timer = setTimeout(() => { try { req.abort(); } catch {} finish(''); }, HTTP_TIMEOUT_MS);
    req.on('response', (response) => {
      response.on('data', (chunk) => { body += chunk.toString(); });
      response.on('end', () => {
        clearTimeout(timer);
        if (!body) { finish(''); return; }
        try {
          const $ = cheerio.load(body);
          const snippets: string[] = [];
          // Snippet dei risultati (descrizione)
          $('.result__snippet').slice(0, 6).each((_, el) => {
            const t = $(el).text().replace(/\s+/g, ' ').trim();
            if (t.length > 20) snippets.push(t);
          });
          // Fallback: titoli dei risultati
          if (snippets.length < 2) {
            $('.result__a').slice(0, 8).each((_, el) => {
              const t = $(el).text().replace(/\s+/g, ' ').trim();
              if (t.length > 10) snippets.push(t);
            });
          }
          console.log(`[DuckDuckGo] "${query}": ${snippets.length} snippet(s)`);
          finish(snippets.join('\n\n'));
        } catch (err) {
          console.log('[DuckDuckGo] parse error:', err);
          finish('');
        }
      });
    });
    req.on('error', () => { clearTimeout(timer); finish(''); });
    req.end();
  });
};

const extractProductInfo = async (title: string, apiKey: string): Promise<ProductInfo | null> => {
  const { cleanQuery, productName } = await extractCleanQuery(title, apiKey);
  console.log(`[extractProductInfo] cleanQuery: "${cleanQuery}"`);

  // Cerca specs su DuckDuckGo
  const snippets = await searchDuckDuckGo(`${cleanQuery} scheda tecnica specifiche tecniche`);
  let keySpecs: string[] = [];

  if (snippets && apiKey) {
    const raw = await callGroq(apiKey, [
      { role: 'system', content: 'Sei un esperto tecnico. Estrai specifiche da risultati web. Rispondi SOLO con JSON valido, senza testo extra.' },
      { role: 'user', content: `Prodotto ESATTO cercato: "${cleanQuery}"\n\nRisultati web:\n${snippets.substring(0, 2500)}\n\nEstrai le specifiche tecniche della variante ESATTA "${cleanQuery}". Se i risultati contengono più varianti (es. 6GB e 8GB, 128GB e 256GB), prendi SOLO le specs della variante indicata nel nome del prodotto.\nRispondi SOLO con JSON: {"keySpecs": ["spec1", "spec2", ...]}\nSolo specs certe. Se non trovi nulla: {"keySpecs": []}` }
    ], 400);
    if (raw) {
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed.keySpecs)) keySpecs = parsed.keySpecs;
        }
      } catch { /* keySpecs vuoto */ }
    }
  }

  console.log(`[extractProductInfo] keySpecs: ${JSON.stringify(keySpecs)}`);
  return { cleanQuery, productName, keySpecs };
};

const getUpcItemDb = (url: string): Promise<any> => {
  return new Promise((resolve) => {
    const req = net.request({ method: 'GET', url });
    req.setHeader('Accept', 'application/json');
    req.setHeader('User-Agent', 'Mozilla/5.0');
    let body = '';
    req.on('response', (response) => {
      response.on('data', (chunk) => { body += chunk.toString(); });
      response.on('end', () => {
        try { resolve(JSON.parse(body)); } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.end();
  });
};

const ipcs = (mainWindow: BrowserWindow) => {
  ipcMain.handle(IPC_CHANNELS.PUPPETEER_OPEN_LOGIN_PAGE, () => handleAuth(mainWindow.webContents));
  ipcMain.handle(IPC_CHANNELS.PUPPETEER_STORE_COOKIES, () => getAndStoreCookies());

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => getAppSettings());
  ipcMain.handle(IPC_CHANNELS.STORE_SETTINGS, (_, appSettings: AppSettings) => {
    console.log('[IPC] STORE_SETTINGS received:', JSON.stringify(appSettings).substring(0, 300));
    return storeSettings(appSettings);
  });

  // Helper: notifica desktop al termine di un'operazione lunga
  const notifyDone = (title: string, body: string): void => {
    try {
      if (Notification.isSupported()) {
        new Notification({ title, body, silent: false }).show();
      }
    } catch (err) {
      console.error('[Notification] errore:', err);
    }
  };

  ipcMain.handle(IPC_CHANNELS.INSERT_ITEMS, async (_, itemIds: string[]) => {
    await insertItems(mainWindow.webContents, itemIds);
    notifyDone('Sellbot', `Inserimento completato (${itemIds.length} annunc${itemIds.length === 1 ? 'io' : 'i'})`);
  });

  ipcMain.handle(IPC_CHANNELS.REMOVE_LISTINGS, async (_, itemIds: string[]) => {
    await removeListings(mainWindow.webContents, itemIds);
    notifyDone('Sellbot', `Rimozione completata (${itemIds.length} annunc${itemIds.length === 1 ? 'io' : 'i'})`);
  });

  ipcMain.handle(IPC_CHANNELS.CHECK_ITEMS_STATUS, async (_, itemIds: string[]) => {
    const settings = getSettings();
    const chromiumPath = settings?.chromiumPath || '';
    const stillOnline = await checkItemsOnline(itemIds, mainWindow.webContents, chromiumPath);
    const items = await getItemsWithEncodedPics();
    for (const item of items) {
      if (!itemIds.includes(item.id as string)) continue;
      const newStatus = stillOnline.includes(item.id as string);
      if (item.isOnline !== newStatus) {
        await updateItem({ ...item, isOnline: newStatus });
      }
    }
    notifyDone('Sellbot', `Controllo stato completato (${stillOnline.length} online)`);
  });

  ipcMain.handle(IPC_CHANNELS.GET_ANTHROPIC_KEY, () => {
    const settings = getSettings();
    return settings?.geminiApiKey || null;
  });

  ipcMain.handle(IPC_CHANNELS.GENERATE_DESCRIPTION, async (_, prompt: string, systemMessage?: string) => {
    const settings = getSettings();
    const apiKey = settings?.geminiApiKey;
    if (!apiKey) return null;

    console.log('[IPC] GENERATE_DESCRIPTION systemMessage:', systemMessage ?? '(none)');
    console.log('[IPC] GENERATE_DESCRIPTION prompt (first 200):', prompt.substring(0, 200));

    const messages: { role: string; content: string }[] = [];
    if (systemMessage) messages.push({ role: 'system', content: systemMessage });
    messages.push({ role: 'user', content: prompt });

    const body = JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 1024
    });

    return new Promise((resolve) => {
      const request = net.request({
        method: 'POST',
        url: 'https://api.groq.com/openai/v1/chat/completions'
      });
      request.setHeader('Content-Type', 'application/json');
      request.setHeader('Authorization', `Bearer ${apiKey}`);

      let responseBody = '';
      request.on('response', (response) => {
        console.log('[GENERATE_DESCRIPTION] status:', response.statusCode);
        response.on('data', (chunk) => { responseBody += chunk.toString(); });
        response.on('end', () => {
          try {
            const parsed = JSON.parse(responseBody);
            console.log('[GENERATE_DESCRIPTION] content:', parsed.choices?.[0]?.message?.content);
          } catch { console.log('[GENERATE_DESCRIPTION] raw:', responseBody.substring(0, 500)); }
          try {
            const data = JSON.parse(responseBody);
            resolve(data.choices?.[0]?.message?.content || null);
          } catch {
            resolve(null);
          }
        });
      });
      request.on('error', (err) => {
        console.error('[GENERATE_DESCRIPTION] request error:', err);
        resolve(null);
      });
      request.write(body);
      request.end();
    });
  });

  ipcMain.handle(IPC_CHANNELS.GET_SCHEDULES, () => getSchedules());

  ipcMain.handle(IPC_CHANNELS.SAVE_SCHEDULE, (_, schedule: Schedule) => {
    const schedules = getSchedules();
    schedules.push(schedule);
    saveSchedules(schedules);
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_SCHEDULE, (_, id: string) => {
    const schedules = getSchedules().filter((s) => s.id !== id);
    saveSchedules(schedules);
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_SCHEDULE, (_, updated: Schedule) => {
    const schedules = getSchedules().map((s) => (s.id === updated.id ? updated : s));
    saveSchedules(schedules);
  });

  // Scheduler: controlla ogni minuto
  // lastStatsRefresh persistito su disco (sopravvive al riavvio dell'app)
  let lastStatsRefresh: Date | null = (() => {
    const s = getSchedulerState();
    return s.lastStatsRefresh ? new Date(s.lastStatsRefresh) : null;
  })();
  // Anti-overlap: previene che due tick del scheduler partano in parallelo se
  // un tick precedente impiega > 60s (es. un'auto-ripubblicazione lunga)
  let schedulerRunning = false;

  const runScheduler = async () => {
    if (schedulerRunning) return;
    schedulerRunning = true;
    try {
      await runSchedulerInner();
    } catch (err) {
      console.error('[Scheduler] errore non gestito:', err);
    } finally {
      schedulerRunning = false;
    }
  };

  const runSchedulerInner = async () => {
    const schedules = getSchedules();
    const appSettings = getAppSettings();
    const now = new Date();
    let changed = false;

    // --- Refresh stats periodico ---
    const statsRefreshHours = appSettings?.statsRefreshHours || 0;
    if (statsRefreshHours > 0) {
      const shouldRefresh =
        !lastStatsRefresh ||
        now.getTime() - lastStatsRefresh.getTime() >= statsRefreshHours * 3600000;

      if (shouldRefresh) {
        const chromiumPath = appSettings?.chromiumPath || '';
        const allItems = getItems();
        const onlineIds = allItems.filter((i) => i.isOnline && i.id).map((i) => i.id!);
        if (onlineIds.length > 0) {
          log(mainWindow.webContents, '[Stats] Aggiornamento automatico stats...');
          try {
            const statsMap = await fetchItemsStats(onlineIds, mainWindow.webContents, chromiumPath);
            for (const [itemId, stats] of Object.entries(statsMap)) {
              const item = getItem(itemId);
              if (item) await updateItem({ ...item, stats });
            }
            lastStatsRefresh = now;
            saveSchedulerState({ lastStatsRefresh: now.toISOString() });
            log(mainWindow.webContents, '[Stats] Aggiornamento completato');

            // --- Auto-ripubblica se posizione > soglia ---
            for (const schedule of schedules) {
              if (!schedule.active || schedule.paused || !schedule.republishOnPageOver) continue;
              const threshold = schedule.republishOnPageOver;
              const itemsToRepublish = schedule.itemIds.filter((itemId) => {
                const item = getItem(itemId);
                if (!item?.isOnline || !item?.stats?.position) return false;
                const pageNum = parseInt(item.stats.position.replace('°', ''));
                return !isNaN(pageNum) && pageNum > threshold;
              });
              if (itemsToRepublish.length > 0) {
                const label = schedule.name || schedule.id;
                log(mainWindow.webContents, `[Auto-ripubblica] "${label}" — ${itemsToRepublish.length} annunci oltre pagina ${threshold}, avvio ripubblicazione...`);
                let outcome: 'success' | 'error' = 'success';
                let message: string | undefined;
                try {
                  await removeAndInsertItems(mainWindow.webContents, itemsToRepublish);
                } catch (err) {
                  console.error('[Auto-ripubblica] Errore:', err);
                  log(mainWindow.webContents, `[Auto-ripubblica] Errore: ${err}`);
                  outcome = 'error';
                  message = String(err);
                }
                schedule.history = [...(schedule.history || []).slice(-19), { runAt: now.toISOString(), outcome, message }];
                schedule.lastRun = now.toISOString();
                changed = true;
              }
            }
          } catch (err) {
            log(mainWindow.webContents, `[Stats] Errore aggiornamento: ${err}`);
          }
        }
      }
    }

    // --- Pianificazioni temporali (once / recurring) ---
    for (const schedule of schedules) {
      if (!schedule.active || schedule.paused) continue;
      if (schedule.type === 'watch' || !schedule.nextRun) continue;
      const nextRun = new Date(schedule.nextRun);
      if (now >= nextRun) {
        let outcome: 'success' | 'error' = 'success';
        let message: string | undefined;
        try {
          await removeAndInsertItems(mainWindow.webContents, schedule.itemIds);
        } catch (err) {
          console.error('[Scheduler] Errore:', err);
          outcome = 'error';
          message = String(err);
        }
        const historyEntry = { runAt: now.toISOString(), outcome, message };
        schedule.history = [...(schedule.history || []).slice(-19), historyEntry];
        schedule.lastRun = now.toISOString();

        if (schedule.type === 'once') {
          schedule.active = false;
        } else {
          const hours = schedule.intervalHours || 24;
          const base = new Date(schedule.lastRun || schedule.startAt || now);
          schedule.nextRun = new Date(base.getTime() + hours * 3600000).toISOString();
        }
        changed = true;
      }
    }

    if (changed) saveSchedules(schedules);
  };

  setInterval(runScheduler, 60 * 1000);

  ipcMain.handle(IPC_CHANNELS.OPEN_EXTERNAL, (_, url: string) => shell.openExternal(url));

  ipcMain.handle(IPC_CHANNELS.CANCEL_OPERATION, () => {
    requestCancel();
    log(mainWindow.webContents, '[Cancel] Richiesta annullamento ricevuta');
  });

  ipcMain.handle(IPC_CHANNELS.IS_BUSY, () => isBusy());

  ipcMain.handle(IPC_CHANNELS.RUN_SCHEDULE_NOW, async (_, id: string) => {
    const schedules = getSchedules();
    const schedule = schedules.find((s) => s.id === id);
    if (!schedule) return;
    const now = new Date();
    let outcome: 'success' | 'error' = 'success';
    let message: string | undefined;
    try {
      log(mainWindow.webContents, `[Esegui ora] Avvio pianificazione "${schedule.name || id}"...`);
      await removeAndInsertItems(mainWindow.webContents, schedule.itemIds);
    } catch (err) {
      outcome = 'error';
      message = String(err);
    }
    schedule.history = [...(schedule.history || []).slice(-19), { runAt: now.toISOString(), outcome, message }];
    schedule.lastRun = now.toISOString();
    if (schedule.type === 'recurring' && schedule.intervalHours) {
      schedule.nextRun = new Date(now.getTime() + schedule.intervalHours * 3600000).toISOString();
    }
    saveSchedules(schedules.map((s) => (s.id === id ? schedule : s)));
  });

  ipcMain.handle(IPC_CHANNELS.EXTRACT_PRODUCT_INFO, async (_, title: string) => {
    const settings = getSettings();
    const apiKey = settings?.geminiApiKey;
    if (!apiKey) return null;
    return extractProductInfo(title, apiKey);
  });

  ipcMain.handle(IPC_CHANNELS.SEARCH_EAN_BY_TITLE, async (_, title: string) => {
    const settings = getSettings();
    const apiKey = settings?.geminiApiKey;
    let query = title;
    if (apiKey) {
      const { cleanQuery } = await extractCleanQuery(title, apiKey);
      query = cleanQuery;
    }
    console.log(`[SearchEAN] query: "${query}"`);

    // Cerca EAN su DuckDuckGo
    const snippets = await searchDuckDuckGo(`${query} EAN codice barcode`);
    if (!snippets) return null;

    // Estrai pattern EAN-13 o EAN-8 dai snippets
    const eanMatches = snippets.match(/\b(\d{13}|\d{8})\b/g) || [];
    const uniqueEans = [...new Set(eanMatches)];
    console.log(`[SearchEAN] EAN candidati: ${uniqueEans.join(', ') || 'nessuno'}`);

    if (!uniqueEans.length) return null;

    // Se più candidati, Groq sceglie quello corretto
    let ean = uniqueEans[0];
    if (uniqueEans.length > 1 && apiKey) {
      const raw = await callGroq(apiKey, [{
        role: 'user',
        content: `Prodotto: "${query}"\nEAN trovati: ${uniqueEans.slice(0, 5).join(', ')}\nQuale EAN corrisponde a questo prodotto esatto? Rispondi SOLO con il numero EAN.`
      }], 20);
      const picked = raw?.trim().match(/\d{8,13}/)?.[0];
      if (picked && uniqueEans.includes(picked)) ean = picked;
    }

    console.log(`[SearchEAN] EAN scelto: ${ean}`);

    // Prova lookup UPCItemDB per dati aggiuntivi
    const upcResult = await getUpcItemDb(`https://api.upcitemdb.com/prod/trial/lookup?upc=${ean}`);
    const upcItem = upcResult?.items?.[0];

    return {
      ean,
      title: upcItem?.title || query,
      description: upcItem?.description || '',
      brand: upcItem?.brand || '',
    };
  });

  ipcMain.handle(IPC_CHANNELS.LOOKUP_EAN_PRODUCT, async (_, ean: string) => {
    console.log(`[LookupEAN] EAN: ${ean}`);
    const result = await getUpcItemDb(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(ean)}`);
    const item = result?.items?.[0];
    if (!item) return null;
    console.log(`[LookupEAN] trovato: "${item.title}"`);
    return {
      ean: item.ean || item.upc || ean,
      title: item.title || '',
      description: item.description || '',
      brand: item.brand || '',
    };
  });

  ipcMain.handle(IPC_CHANNELS.FETCH_ITEMS_STATS, async (_, itemIds: string[]) => {
    const settings = getSettings();
    const chromiumPath = settings?.chromiumPath || '';
    const statsMap = await fetchItemsStats(itemIds, mainWindow.webContents, chromiumPath);
    // Aggiorna stats e isOnline per ogni item passato
    let foundCount = 0;
    for (const itemId of itemIds) {
      const item = await getItemWithEncodedPics(itemId);
      if (!item) continue;
      const stats = statsMap[itemId];
      if (stats) {
        await updateItem({ ...item, stats, isOnline: true });
        foundCount++;
      } else {
        await updateItem({ ...item, isOnline: false });
      }
    }
    notifyDone('Sellbot', `Stats aggiornate (${foundCount}/${itemIds.length} online)`);
    return statsMap;
  });

  ipcMain.handle(IPC_CHANNELS.FETCH_PRICE_RANGE, async (_, title: string, category: string) => {
    const settings = getSettings();
    const apiKey = settings?.geminiApiKey;

    // Step 1: estrai prodotto preciso con Groq
    let searchQuery = title;
    let productName = title;
    if (apiKey) {
      const info = await extractProductInfo(title, apiKey);
      if (info?.cleanQuery) {
        searchQuery = info.cleanQuery;
        productName = info.productName;
        console.log(`[PriceRange] query pulita: "${searchQuery}" (da: "${title}")`);
      }
    }

    // Step 2: cerca su Subito con la query pulita
    const cookies_pr = settings?.cookies || [];
    const cookieHeader_pr = cookies_pr
      .filter((c: any) => c.domain?.includes('subito.it'))
      .map((c: any) => `${c.name}=${c.value}`)
      .join('; ');

    const priceAds = await searchSubitoAds(searchQuery, cookieHeader_pr, 20);

    // Parole che indicano un bundle/sistema completo — escludi questi annunci
    const bundleKeywords = ['pc gaming', 'gaming pc', 'computer completo', 'sistema completo', 'assemblato', 'workstation', 'build', ' rtx ', ' gtx ', ' rx 6', ' rx 7', 'scheda madre', 'motherboard', 'ddr4', 'ddr5', ' ssd ', ' hdd ', 'intel core i', 'case pc', 'torre pc'];

    // Estrai termini distintivi dalla query (numeri+lettere come "7900X", parole >4 char non generiche)
    const genericWords = new Set(['usato', 'vendo', 'nuovo', 'ottime', 'condizioni', 'come', 'poco', 'originale', 'completo', 'processore', 'smartphone', 'laptop', 'notebook', 'tablet']);
    const relevantTerms = searchQuery.toLowerCase()
      .split(/\s+/)
      .filter(t => t.length >= 3 && !genericWords.has(t));

    const prices: number[] = [];
    for (const ad of priceAds) {
      const subject = (ad.subject || '').toLowerCase();
      const isBundle = bundleKeywords.some(kw => subject.includes(kw));
      if (isBundle) {
        console.log(`[PriceRange] scartato (bundle): "${ad.subject}"`);
        continue;
      }
      // Rilevanza: almeno la metà dei termini della query deve comparire nel titolo
      const matchCount = relevantTerms.filter(t => subject.includes(t)).length;
      const minMatch = Math.ceil(relevantTerms.length / 2);
      if (matchCount < minMatch) {
        console.log(`[PriceRange] scartato (irrilevante, ${matchCount}/${relevantTerms.length}): "${ad.subject}"`);
        continue;
      }
      const priceFeature = Array.isArray(ad.features)
        ? ad.features.find((f: any) => f.uri === '/price')
        : null;
      const raw = priceFeature?.values?.[0]?.key;
      const price = raw ? parseFloat(raw) : NaN;
      if (!isNaN(price) && price > 0) prices.push(price);
    }
    console.log(`[PriceRange] Subito: ${prices.length} prezzi trovati (raw)`);

    // Filtra outlier: prima IQR, poi filtro relativo alla mediana (rimuove accessori <25% e bundle >300%)
    const filteredPrices = (() => {
      if (prices.length < 2) return prices;
      const sorted = [...prices].sort((a, b) => a - b);

      // Step 1: IQR con moltiplicatore 1.0 (più stretto)
      let result = sorted;
      if (sorted.length >= 4) {
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        result = sorted.filter(p => p >= q1 - 1.0 * iqr && p <= q3 + 1.0 * iqr);
      }

      // Step 2: filtro relativo alla mediana — rimuove valori < 25% o > 300% della mediana
      if (result.length >= 2) {
        const mid = result[Math.floor(result.length / 2)];
        result = result.filter(p => p >= mid * 0.25 && p <= mid * 3.0);
      }

      return result;
    })();
    console.log(`[PriceRange] dopo filtro outlier: ${filteredPrices.length} prezzi (raw: ${prices.length})`);

    const subitoSearchUrl = `https://www.subito.it/annunci-italia/vendita/usato/?q=${encodeURIComponent(searchQuery)}`;

    if (filteredPrices.length >= 2) {
      return {
        source: 'subito',
        min: Math.min(...filteredPrices),
        max: Math.max(...filteredPrices),
        avg: Math.round(filteredPrices.reduce((a, b) => a + b, 0) / filteredPrices.length),
        count: filteredPrices.length,
        url: subitoSearchUrl
      };
    }

    // Step 3: fallback Groq con la query pulita (più precisa del titolo grezzo)
    if (!apiKey) return null;

    const categoryNames: Record<string, string> = {
      '10': 'Informatica', '44': 'Console e videogiochi', '11': 'Audio e video',
      '40': 'Fotografia', '12': 'Telefonia', '2': 'Auto', '3': 'Moto e scooter',
      '14': 'Arredamento', '37': 'Elettrodomestici', '15': 'Giardino e Fai da te'
    };
    const catName = categoryNames[category] || category;

    const prompt = `Stima il prezzo di mercato usato in Italia su Subito.it per ESATTAMENTE questo prodotto: "${productName}" (categoria: ${catName}).
NON confonderlo con versioni diverse, modelli simili o prodotti di fascia diversa.
Rispondi con un JSON: {"min": numero, "max": numero, "avg": numero, "detail": "1-2 frasi: come hai stimato il prezzo e quanto sei sicuro"}
Solo JSON valido.`;

    const groqResponse = await callGroq(apiKey, [
      { role: 'system', content: 'Sei un esperto di prezzi di seconda mano in Italia. Stima prezzi SOLO per il prodotto esatto indicato. Se non sei sicuro, allarga il range e dillo nel detail.' },
      { role: 'user', content: prompt }
    ], 200);

    if (groqResponse) {
      try {
        const jsonMatch = groqResponse.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.min && parsed.max && parsed.avg) {
            const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(productName + ' prezzo usato')}`;
            return { source: 'ai', min: parsed.min, max: parsed.max, avg: parsed.avg, count: 0, detail: parsed.detail || null, url: googleUrl };
          }
        }
      } catch { /* ignore */ }
    }

    return null;
  });

  ipcMain.handle(IPC_CHANNELS.EXPORT_ITEMS, async () => {
    const items = getItems();
    const zip = new AdmZip();

    const itemsForExport = items.map((item) => {
      const photoNames: string[] = [];
      if (item.photos) {
        item.photos.forEach((photoPath, idx) => {
          if (!photoPath || photoPath.length > 260) return;
          const ext = path.extname(photoPath) || '.jpg';
          const photoName = `${item.id}_${idx}${ext}`;
          try {
            zip.addLocalFile(photoPath, 'photos', photoName);
            photoNames.push(photoName);
          } catch { /* skip missing */ }
        });
      }
      const { filePath: _fp, ...itemWithoutPath } = item as Item & { filePath?: string };
      return { ...itemWithoutPath, photos: photoNames };
    });

    zip.addFile('items.json', Buffer.from(JSON.stringify(itemsForExport, null, 2)));

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Esporta annunci',
      defaultPath: `sellbot-export-${new Date().toISOString().slice(0, 10)}.zip`,
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
    });

    if (!canceled && filePath) {
      zip.writeZip(filePath);
      return { success: true };
    }
    return { success: false };
  });

  ipcMain.handle(IPC_CHANNELS.IMPORT_ITEMS, async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Importa annunci',
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
      properties: ['openFile']
    });

    if (canceled || !filePaths[0]) return { success: false, count: 0 };

    const settings = getSettings();
    const itemsPath = settings?.itemsPath;
    if (!itemsPath) return { success: false, count: 0, error: 'itemsPath non configurato' };

    const zip = new AdmZip(filePaths[0]);
    const itemsEntry = zip.getEntry('items.json');
    if (!itemsEntry) return { success: false, count: 0, error: 'items.json non trovato nello zip' };

    const importedItems: (Item & { photos?: string[] })[] = JSON.parse(
      itemsEntry.getData().toString('utf-8')
    );

    let count = 0;
    for (const item of importedItems) {
      const newId = uuidv4();
      const newPhotoPaths: string[] = [];

      if (item.photos) {
        item.photos.forEach((photoName, idx) => {
          const entry = zip.getEntry(`photos/${photoName}`);
          if (entry) {
            const ext = path.extname(photoName) || '.jpg';
            const newPhotoPath = path.join(itemsPath, `${newId}_${idx}${ext}`);
            writeFileSync(newPhotoPath, entry.getData());
            newPhotoPaths.push(newPhotoPath);
          }
        });
      }

      const { filePath: _fp, id: _id, ...rest } = item as Item & { filePath?: string };
      writeFileSync(
        path.join(itemsPath, `${newId}.json`),
        JSON.stringify({ ...rest, id: newId, photos: newPhotoPaths })
      );
      count++;
    }

    return { success: true, count };
  });

  ipcMain.handle(IPC_CHANNELS.GET_ITEMS, () => getItemsWithEncodedPics());
  ipcMain.handle(IPC_CHANNELS.GET_ITEM, (_, itemId: string) => getItemWithEncodedPics(itemId));
  ipcMain.handle(IPC_CHANNELS.UPDATE_ITEM, (_, item: Item) => updateItem(item));
  ipcMain.handle(IPC_CHANNELS.CLONE_ITEM, (_, itemId: string) => cloneItem(itemId));
  ipcMain.handle(IPC_CHANNELS.DELETE_ITEM, (_, itemId: string) => deleteItem(itemId));
  ipcMain.handle(IPC_CHANNELS.GET_TRASH, () => getTrashItems());
  ipcMain.handle(IPC_CHANNELS.RESTORE_ITEM, (_, itemId: string) => restoreItem(itemId));
  ipcMain.handle(IPC_CHANNELS.PERMANENTLY_DELETE_ITEM, (_, itemId: string) => permanentlyDeleteItem(itemId));
  ipcMain.handle(IPC_CHANNELS.GET_COOKIES, () => {
    const settings = getSettings();
    const cookies = settings?.cookies || [];
    const userDataCookie = cookies.find((c: any) => c.name === 'user_data');
    if (userDataCookie) {
      try {
        const userData = JSON.parse(decodeURIComponent(userDataCookie.value));
        return { userId: userData.id, cookies };
      } catch {
        return { userId: null, cookies };
      }
    }
    return { userId: null, cookies };
  });
  ipcMain.handle(IPC_CHANNELS.FETCH_VEHICLE_CONFIG, async (_, userId: string, categoryId: string, brandCode?: string, modelCode?: string) => {
    const settings = getSettings();
    const cookies = settings?.cookies || [];
    const cookieHeader = cookies
      .filter((c: any) => c.domain?.includes('subito.it'))
      .map((c: any) => `${c.name}=${c.value}`)
      .join('; ');

    const isMoto = ['3', '36', '22', '34', '4'].includes(categoryId);
    const brandParam = isMoto ? 'bikebrand' : 'carbrand';
    const modelParam = isMoto ? 'bikemodel' : 'carmodel';

    const url = brandCode && modelCode
      ? `https://hades.subito.it/v1/insertion/user/${userId}/configuration/category/${categoryId}?type=sell&${brandParam}=${brandCode}&${modelParam}=${modelCode}`
      : brandCode
      ? `https://hades.subito.it/v1/insertion/user/${userId}/configuration/category/${categoryId}?type=sell&${brandParam}=${brandCode}`
      : `https://hades.subito.it/v1/insertion/user/${userId}/configuration/category/${categoryId}?type=sell`;

    console.log('brandCode:', brandCode, 'modelCode:', modelCode);
    console.log('Fetching URL:', url);
    console.log('Cookie header length:', cookieHeader.length);

    return new Promise((resolve) => {
      const request = net.request({
        method: 'GET',
        url,
        session: undefined
      });
      request.setHeader('Cookie', cookieHeader);
      request.setHeader('Origin', 'https://inserimento.subito.it');
      request.setHeader('Referer', 'https://inserimento.subito.it/');
      request.setHeader('X-Subito-Channel', 'web-desktop');
      request.setHeader('Accept', 'application/json');
      request.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      let body = '';
      request.on('response', (response) => {
        response.on('data', (chunk) => { body += chunk.toString(); });
        response.on('end', () => {
          console.log('Response body length:', body.length);
          console.log('First 200 chars:', body.substring(0, 200));
          try { resolve(JSON.parse(body)); }
          catch { resolve({}); }
        });
      });
      request.on('error', () => resolve({}));
      request.end();
    });
  });
};

export default ipcs;
export { IPC_CHANNELS };
