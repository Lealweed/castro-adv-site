import React, { createContext, useContext, useMemo, useState } from 'react';

import {
  clearOrgId,
  clearTokens,
  getAccessToken,
  getOrgId,
  setOrgId,
  setTokens,
  type Tokens,
} from '@/lib/apiClient';

type AuthState = {
  isAuthenticated: boolean;
  orgId: string | null;
  setOrgId: (orgId: string) => void;
  signIn: (tokens: Tokens) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [orgIdState, setOrgIdState] = useState<string | null>(() => getOrgId());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(getAccessToken()));

  const value = useMemo<AuthState>(() => {
    return {
      isAuthenticated,
      orgId: orgIdState,
      setOrgId: (orgId: string) => {
        setOrgId(orgId);
        setOrgIdState(orgId);
      },
      signIn: (tokens: Tokens) => {
        setTokens(tokens);
        setIsAuthenticated(true);
      },
      signOut: () => {
        clearTokens();
        clearOrgId();
        setIsAuthenticated(false);
        setOrgIdState(null);
      },
    };
  }, [isAuthenticated, orgIdState]);

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
