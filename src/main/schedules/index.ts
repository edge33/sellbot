import { app } from 'electron';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import type { Schedule } from '../../shared/types';

const getScheduleFilePath = () =>
  path.join(app.getPath('appData'), 'sellbot', 'schedules.json');

const getSchedulerStateFilePath = () =>
  path.join(app.getPath('appData'), 'sellbot', 'scheduler_state.json');

const getSchedules = (): Schedule[] => {
  try {
    const filePath = getScheduleFilePath();
    if (!existsSync(filePath)) return [];
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
};

const saveSchedules = (schedules: Schedule[]) => {
  writeFileSync(getScheduleFilePath(), JSON.stringify(schedules));
};

/** Stato persistente del scheduler (sopravvive ai riavvii) */
type SchedulerState = { lastStatsRefresh?: string };

const getSchedulerState = (): SchedulerState => {
  try {
    const p = getSchedulerStateFilePath();
    if (!existsSync(p)) return {};
    return JSON.parse(readFileSync(p, 'utf-8'));
  } catch {
    return {};
  }
};

const saveSchedulerState = (state: SchedulerState): void => {
  try {
    writeFileSync(getSchedulerStateFilePath(), JSON.stringify(state));
  } catch (err) {
    console.error('[scheduler] errore salvataggio stato:', err);
  }
};

export { getSchedules, saveSchedules, getSchedulerState, saveSchedulerState };
