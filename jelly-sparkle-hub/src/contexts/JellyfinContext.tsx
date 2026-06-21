import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authenticateByName, type JellyfinConfig } from "@/lib/jellyfin";

interface JellyfinContextType {
  config: JellyfinConfig | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (serverUrl: string, username: string, password: string) => Promise<void>;
  logout: () => void;
}

const JellyfinContext = createContext<JellyfinContextType | null>(null);

const STORAGE_KEY = "jellyfin_config";

export function JellyfinProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<JellyfinConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setConfig(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (serverUrl: string, username: string, password: string) => {
    const result = await authenticateByName(serverUrl, username, password);
    const newConfig: JellyfinConfig = {
      serverUrl,
      userId: result.userId,
      accessToken: result.accessToken,
    };
    setConfig(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
  }, []);

  const logout = useCallback(() => {
    setConfig(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <JellyfinContext.Provider value={{ config, isAuthenticated: !!config?.accessToken, isLoading, login, logout }}>
      {children}
    </JellyfinContext.Provider>
  );
}

export function useJellyfin() {
  const ctx = useContext(JellyfinContext);
  if (!ctx) throw new Error("useJellyfin must be used within JellyfinProvider");
  return ctx;
}
