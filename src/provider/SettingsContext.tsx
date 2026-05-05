import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { apiGet, apiPut } from "../api";
import { UserContext } from "./UserContext";

export type SettingsType = {
  useIQR: boolean;
  useAboveAverageShots: boolean;
  unit: "meters" | "yards";
};

interface SettingsContextProps {
  settings: SettingsType;
  setSettings: React.Dispatch<React.SetStateAction<SettingsType>>;
  isLoading: boolean;
}

const DEFAULT_SETTINGS: SettingsType = {
  useIQR: false,
  useAboveAverageShots: false,
  unit: "meters",
};

export const SettingsContext = createContext<SettingsContextProps>({
  settings: DEFAULT_SETTINGS,
  setSettings: () => {},
  isLoading: true,
});

export const SettingsProvider = ({ children }: PropsWithChildren) => {
  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useContext(UserContext);
  const initialized = useRef(false);

  // Load settings once on mount
  useEffect(() => {
    if (!user) return;
    apiGet<SettingsType>("/api/settings")
      .then((data) => {
        setSettings(data);
        initialized.current = true;
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [user]);

  // Persist settings changes (but not the initial load)
  useEffect(() => {
    if (!initialized.current || isLoading) return;
    apiPut("/api/settings", settings).catch(console.error);
  }, [settings, isLoading]);

  return (
    <SettingsContext.Provider value={{ settings, setSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
