import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface User {
  username: string;
  role: string;
  name?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      console.log('=== AUTHENTICATION ATTEMPT ===');
      console.log('Username:', username);
      console.log('Attempting to authenticate with backend API...');

      // Use actual authentication API
      const response = await apiService.authenticate({ username, password });

      console.log('Authentication response:', response);

      if (response.authenticated && response.user) {
        const userData = {
          username: response.user,
          role: response.role || 'user',
          name: response.user, // You can enhance this with proper name mapping if needed
        };

        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));

        console.log('Authentication successful:', userData);
        return true;
      } else {
        console.log('Authentication failed:', response.error || 'Invalid credentials');
        return false;
      }
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  };

  const logout = () => {
    console.log('=== LOGOUT ===');
    console.log('Clearing user session...');
    setUser(null);
    localStorage.removeItem('user');
    console.log('User logged out successfully');
  };

  // Clear any invalid stored user data on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Validate the stored user data structure
        if (parsedUser && parsedUser.username && parsedUser.role) {
          setUser(parsedUser);
          console.log('Restored user session:', parsedUser);
        } else {
          console.log('Invalid stored user data, clearing...');
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('user');
      }
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
