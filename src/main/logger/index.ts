import { WebContents, app } from 'electron';
import { appendFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import path from 'path';

const LOG_DIR = path.join(app.getPath('userData'), 'logs');
const MAX_LOG_FILES = 14; // mantiene gli ultimi 14 giorni

const ensureLogDir = (): void => {
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
};

const getLogFilePath = (): string => {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(LOG_DIR, `${today}.log`);
};

const rotateOldLogs = (): void => {
  try {
    const files = readdirSync(LOG_DIR)
      .filter((f) => f.endsWith('.log'))
      .map((f) => ({ name: f, path: path.join(LOG_DIR, f), mtime: statSync(path.join(LOG_DIR, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    files.slice(MAX_LOG_FILES).forEach((f) => {
      try { unlinkSync(f.path); } catch { /* ignora */ }
    });
  } catch { /* ignora errori di rotazione */ }
};

let lastRotation = 0;

/**
 * Manda un log al renderer (LogPanel) e lo salva su file.
 * File: AppData/sellbot/logs/YYYY-MM-DD.log
 */
export const log = (webContents: WebContents | null, message: string): void => {
  // 1. Invia al renderer per il LogPanel in-app
  try { webContents?.send('log', message); } catch { /* finestra chiusa */ }

  // 2. Append su file
  try {
    ensureLogDir();
    const now = new Date();
    const ts = now.toISOString().replace('T', ' ').slice(0, 19); // 2026-05-22 16:42:46
    appendFileSync(getLogFilePath(), `[${ts}] ${message}\n`, 'utf-8');

    // Rotazione: al massimo ogni ora
    if (now.getTime() - lastRotation > 3600000) {
      lastRotation = now.getTime();
      rotateOldLogs();
    }
  } catch (err) {
    console.error('[Logger] errore scrittura file:', err);
  }
};

/** Ritorna il percorso della cartella log per uso in altre parti dell'app */
export const getLogDir = (): string => LOG_DIR;
