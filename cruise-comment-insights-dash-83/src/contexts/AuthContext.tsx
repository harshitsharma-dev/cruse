
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
  }, []);  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // HARDCODED AUTHENTICATION - No real API calls
      // Predefined users with different roles
      const hardcodedUsers = {
        'superadmin': { role: 'superadmin', name: 'Super Administrator' },
        'admin': { role: 'admin', name: 'Administrator' },
        'user': { role: 'user', name: 'Regular User' },
        'demo': { role: 'user', name: 'Demo User' },
        'guest': { role: 'user', name: 'Guest User' },
        // Allow empty/any credentials to default to admin
        '': { role: 'admin', name: 'Default Admin' }
      };

      // Get user info based on username, default to admin if not found
      const userInfo = hardcodedUsers[username.toLowerCase()] || hardcodedUsers['admin'];
      
      const response = {
        authenticated: true,
        user: username || 'admin',
        role: userInfo.role,
        name: userInfo.name
      };
      
      if (response.authenticated && response.user) {
        const userData = { 
          username: response.user, 
          role: response.role || 'user',
          name: response.name
        };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
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
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};
