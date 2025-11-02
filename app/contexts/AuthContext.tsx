// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

interface User {
  id: number;
  full_name: string;
  email: string;
  first_name?: string;
  images?: {
    image_name?: string;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  checkTokenExpiry: () => Promise<boolean>;
  refreshAuthData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = async (storedToken: string) => {
    try {
      const res = await axios.get(`${API_URL}/current-user`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      setUser(res.data);
      await AsyncStorage.setItem('userData', JSON.stringify(res.data));
    } catch (error) {
      console.log('Error loading user:', error);
      // If API call fails, token might be invalid
      await logout();
    }
  };

  const isTokenExpired = (token: string): boolean => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      
      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Date.now() / 1000;
      
      // Check if token is expired (with 5 minute buffer)
      return payload.exp < currentTime + 300;
    } catch (error) {
      console.error('Error checking token expiration:', error);
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

  // Initial auth check on app load
  useEffect(() => {
    loadAuthState();
  }, []);

  const loadAuthState = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('userData');

      if (storedToken) {
        // Check if token is expired
        if (isTokenExpired(storedToken)) {
          console.log('Token expired on app load');
          await clearAuth();
        } else {
          // Token is valid
          setToken(storedToken);
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
          // Refresh user data from API in background
          loadUser(storedToken).catch(console.error);
        }
      } else {
        // No token found
        await clearAuth();
      }
    } catch (error) {
      console.error('Failed to load auth state', error);
      await clearAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuth = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error clearing auth:', error);
    }
  };

  const login = async (newToken: string, userData: User) => {
    try {
      await AsyncStorage.setItem('authToken', newToken);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
      router.replace('/(drawer)/dashboard');
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  };

  const logout = async () => {
    await clearAuth();
    router.replace('/auth/login');
  };

  const refreshAuthData = async () => {
    const storedToken = await AsyncStorage.getItem('authToken');
    if (storedToken && !isTokenExpired(storedToken)) {
      await loadUser(storedToken);
    } else {
      await logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isLoading,
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