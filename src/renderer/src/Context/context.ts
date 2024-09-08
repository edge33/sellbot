import React, { useContext } from 'react';
import type { AppSettings } from '@shared/types';

export type SettingsContextState = AppSettings & {
  loading: boolean;
};

export type SettingsContextType = SettingsContextState & {
  updateConfig: () => Promise<void>;
};

const SettingsContext = React.createContext<SettingsContextType>({
  loading: true,
  cookiesStored: false,
  updateConfig: () => Promise.reject(),
  mobilePhone: ''
});

export const useSettingsContext = () => useContext(SettingsContext);

export default SettingsContext;
