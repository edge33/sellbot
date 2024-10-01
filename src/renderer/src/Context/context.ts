import React, { useContext } from 'react';
import type { AppSettings } from '@shared/types';

export type SettingsContextState = {
  loading: boolean;
  appSettings: AppSettings;
};

export type SettingsContextType = SettingsContextState & {
  updateConfig: () => void;
};

const SettingsContext = React.createContext<SettingsContextType>({
  appSettings: {
    cookiesStored: false,
    mobilePhone: '',
    chromiumPath: '',
    itemsPath: ''
  },
  loading: true,
  updateConfig: () => {}
});

export const useSettingsContext = () => useContext(SettingsContext);

export default SettingsContext;
