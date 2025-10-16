import React, { createContext, useContext, useState, useEffect } from 'react';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem('authToken'),
          AsyncStorage.getItem('userData'),
        ]);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          // Only redirect if we're on the login page
          if (pathname === '/login' || pathname === '/') {
            console.log('Redirecting to dashboard from:', pathname);
            router.replace('/(drawer)/dashboard');
         }
        }
      } catch (error) {
        console.error('Failed to load auth state', error);
      } finally {
        setInitialized(true);
      }
    };

    loadAuthState();
  }, [pathname]);

  const login = async (token: string, userData: User) => {
    try {
      console.log('Logging in with data:', userData);
      
      // Store auth data
      await Promise.all([
        AsyncStorage.setItem('authToken', token),
        AsyncStorage.setItem('userData', JSON.stringify(userData)),
      ]);
      
      // Update state
      setToken(token);
      setUser(userData);
      
      console.log('Login successful, navigating to dashboard...');
      
      // Navigate to dashboard
      router.replace('/(drawer)/dashboard');
      
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem('authToken'),
        AsyncStorage.removeItem('userData'),
      ]);
      setToken(null);
      setUser(null);
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, initialized }}>
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