import { useCallback, useEffect, useState } from 'react';
import type { SettingsContextState, SettingsContextType } from './context';
import SettingsContext from './context';

const updateSettings = async (
  setConfig: React.Dispatch<React.SetStateAction<SettingsContextState>>
) => {
  const newSettings = await window.getSettings();
  setConfig((settings) => {
    return { appSettings: newSettings ? newSettings : settings.appSettings, loading: false };
  });
};

const SettingsContextProvider = ({ children }: { children: JSX.Element }) => {
  const [config, setConfig] = useState<SettingsContextState>({
    loading: true,
    appSettings: {
      cookiesStored: false,
      mobilePhone: '',
      chromiumPath: '',
      itemsPath: ''
    }
  });

  const handleUpdateSettings = useCallback(() => updateSettings(setConfig), []);

  useEffect(() => {
    updateSettings(setConfig);
  }, []);

  const contextValue: SettingsContextType = { ...config, updateConfig: handleUpdateSettings };

  return <SettingsContext.Provider value={contextValue}>{children}</SettingsContext.Provider>;
};

export default SettingsContextProvider;
