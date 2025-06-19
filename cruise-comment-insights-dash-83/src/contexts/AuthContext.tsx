
import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService, User } from '../services/api';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on app start
    checkExistingSession();
  }, []);
  const checkExistingSession = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        // Validate session with server
        const sessionResponse = await apiService.validateSession();
        if (sessionResponse.valid && sessionResponse.user) {
          setUser(sessionResponse.user);
        } else {
          localStorage.removeItem('user');
        }
      }
    } catch (error) {
      console.error('Session validation error:', error);
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  };
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await apiService.authenticate(username, password);
      
      if (response.success && response.user) {
        setUser(response.user);
        localStorage.setItem('user', JSON.stringify(response.user));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('user');
    }
  };
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // Check permissions array first
    if (user.permissions && user.permissions.includes(permission)) {
      return true;
    }
    
    // Fallback to role-based permissions
    switch (permission) {
      case 'manage_all_users':
        return user.role === 'superadmin';
      case 'manage_users':
        return user.role === 'superadmin' || user.role === 'admin';
      case 'create_users':
        return user.role === 'superadmin' || user.role === 'admin';
      case 'manage_permissions':
        return user.role === 'superadmin' || user.role === 'admin';
      case 'view_admin_panel':
        return user.role === 'superadmin' || user.role === 'admin';
      case 'access_all_data':
        return user.role === 'superadmin';
      case 'view_analytics':
        return true; // All authenticated users can view analytics
      default:
        return false;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user,
      hasPermission,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};
