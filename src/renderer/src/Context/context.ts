import React, { useContext } from 'react';
import type { AppSettings } from '@shared/types';

export type SettingsContextState = {
  loading: boolean;
  appSettings: AppSettings;
};

export type SettingsContextType = SettingsContextState & {
  updateConfig: () => Promise<void>;
};

const SettingsContext = React.createContext<SettingsContextType>({
  appSettings: {
    cookiesStored: false,
    mobilePhone: '',
    chromiumPath: 'undefined',
    itemsPath: ''
  },
  loading: true,
  updateConfig: () => Promise.reject()
});

export const useSettingsContext = () => useContext(SettingsContext);

export default SettingsContext;
