import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import * as api from './api';
import type { User } from './types';

type AuthState = {
  ready: boolean;
  user: User | null;
  serverUrl: string;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  saveServerUrl: (url: string) => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [serverUrl, setUrl] = useState('');

  useEffect(() => {
    (async () => {
      const session = await api.loadSession();
      setUrl(session.serverUrl);
      if (session.token && session.serverUrl) {
        try {
          const { user } = await api.me();
          setUser(user);
        } catch {
          // An expired token or an unreachable server both land here; the login
          // screen handles it, so drop the token rather than blocking startup.
          await api.setToken('');
        }
      }
      setReady(true);
    })();
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const { token, user } = await api.login(username, password);
    await api.setToken(token);
    setUser(user);
  }, []);

  const signOut = useCallback(async () => {
    await api.setToken('');
    setUser(null);
  }, []);

  const saveServerUrl = useCallback(async (url: string) => {
    await api.setServerUrl(url);
    setUrl(api.getServerUrl());
  }, []);

  return (
    <Ctx.Provider value={{ ready, user, serverUrl, signIn, signOut, saveServerUrl }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
