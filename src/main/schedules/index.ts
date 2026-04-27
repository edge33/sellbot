import { app } from 'electron';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import type { Schedule } from '../../shared/types';

const getScheduleFilePath = () =>
  path.join(app.getPath('appData'), 'sellbot', 'schedules.json');

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

export { getSchedules, saveSchedules };
