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
  checkTokenExpiry: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const pathname = usePathname();

  // Function to check if token is expired
  const isTokenExpired = (token: string): boolean => {
    try {
      // JWT tokens are in format: header.payload.signature
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      // Check if token has expired (add 5 minute buffer)
      return payload.exp < currentTime - 300;
    } catch (error) {
      console.error('Error checking token expiry:', error);
      return true; // If we can't parse, assume expired
    }
  };

  // Function to check token expiry and handle accordingly
  const checkTokenExpiry = async (): Promise<boolean> => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      
      if (!storedToken) {
        await logout();
        return false;
      }

      if (isTokenExpired(storedToken)) {
        console.log('Token has expired, logging out...');
        await logout();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking token expiry:', error);
      await logout();
      return false;
    }
  };

  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem('authToken'),
          AsyncStorage.getItem('userData'),
        ]);

        if (storedToken && storedUser) {
          // Check if token is expired on app start
          if (!isTokenExpired(storedToken)) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            
            // Only redirect if we're on the login page
            if (pathname === '/login' || pathname === '/') {
              console.log('Redirecting to dashboard from:', pathname);
              router.replace('/(drawer)/dashboard');
            }
          } else {
            // Token is expired, clear storage
            console.log('Token expired on app start');
            await logout();
          }
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
      
      // Only navigate to login if we're not already there
      if (pathname !== '/login') {
        router.replace('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      logout, 
      initialized,
      checkTokenExpiry 
    }}>
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

export default AuthProvider;