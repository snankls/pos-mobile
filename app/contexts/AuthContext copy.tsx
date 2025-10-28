// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, usePathname } from 'expo-router';

interface User {
  id: number;
  name: string;
  email: string;
  first_name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
  initialized: boolean;
  checkTokenExpiry: () => Promise<boolean>;
  refreshAuthData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const pathname = usePathname();

  const loadUser = async (storedToken: string) => {
    try {
      const res = await axios.get(`${API_URL}/current-user`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      setUser(res.data);
      await AsyncStorage.setItem('userData', JSON.stringify(res.data));
    } catch (error) {
      console.log('Error loading user:', error);
    }
  };

  const isTokenExpired = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime - 300;
    } catch {
      return true;
    }
  };

  const checkTokenExpiry = async (): Promise<boolean> => {
    const storedToken = await AsyncStorage.getItem('authToken');
    if (!storedToken || isTokenExpired(storedToken)) {
      await logout();
      return false;
    }
    return true;
  };

  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem('authToken'),
          AsyncStorage.getItem('userData'),
        ]);

        if (storedToken && !isTokenExpired(storedToken)) {
          setToken(storedToken);
          if (storedUser) setUser(JSON.parse(storedUser));
          await loadUser(storedToken);

          if (pathname === '/auth/login' || pathname === '/') {
            router.replace('/(drawer)/dashboard');
          }
        } else {
          await logout();
        }
      } catch (error) {
        console.error('Failed to load auth state', error);
        await logout();
      } finally {
        setInitialized(true);
      }
    };
    loadAuthState();
  }, [pathname]);

  const login = async (token: string, userData: User) => {
    await Promise.all([
      AsyncStorage.setItem('authToken', token),
      AsyncStorage.setItem('userData', JSON.stringify(userData)),
    ]);
    setToken(token);
    setUser(userData);
    router.replace('/(drawer)/dashboard');
  };

  const logout = async () => {
    await Promise.all([
      AsyncStorage.removeItem('authToken'),
      AsyncStorage.removeItem('userData'),
    ]);
    setToken(null);
    setUser(null);
    if (pathname !== '/auth/login') router.replace('/auth/login');
  };

  // 🆕 Added refreshAuthData for GlobalRefresh
  const refreshAuthData = async () => {
    const storedToken = await AsyncStorage.getItem('authToken');
    if (storedToken) {
      await loadUser(storedToken);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        initialized,
        checkTokenExpiry,
        refreshAuthData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
