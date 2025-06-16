
import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface User {
  username: string;
  role: string;
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
  // Bypass login - always set a default user
  const [user, setUser] = useState<User | null>({ username: 'admin', role: 'admin' });

  useEffect(() => {
    // Always set a default user to bypass login
    const defaultUser = { username: 'admin', role: 'admin' };
    setUser(defaultUser);
    localStorage.setItem('user', JSON.stringify(defaultUser));
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    // Always return true to bypass authentication
    const userData = { username: username || 'admin', role: 'admin' };
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };
  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: true // Always authenticated to bypass login
    }}>
      {children}
    </AuthContext.Provider>
  );
};
