import puppeteer from 'puppeteer-core';
import { WebContents } from 'electron';

let isRunning = false;

async function runPuppeteer(webContents: WebContents): Promise<void> {
  if (isRunning) {
    return;
  }

  isRunning = true;
  const puppeteerBrowser = await puppeteer.launch({
    executablePath: './ungoogled-chromium_128.0.6613.84-1_linux/chrome',
    defaultViewport: {
      width: 1366,
      height: 768
    },
    headless: false // Puppeteer controlled browser should be visible
  });

  const puppeteerPage = await puppeteerBrowser.newPage();

  // Load a URL or website
  await puppeteerPage.goto('https://subito.it');
  const content = await puppeteerPage.content();

  webContents.send('html', content);

  // window.loadURL('data:text/html;charset=utf-8,' + encodeURI(content))
  webContents.send('log', 'Opened page');
  webContents.send('log', 'done');
  isRunning = false;
}

export default runPuppeteer;
