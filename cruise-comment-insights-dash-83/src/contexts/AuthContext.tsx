
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
    
    // Listen for auth failures from API service
    const handleAuthFailure = () => {
      console.log('Auth failure detected, logging out user');
      setUser(null);
    };
    
    window.addEventListener('auth-failure', handleAuthFailure);
    
    // Cleanup event listener
    return () => {
      window.removeEventListener('auth-failure', handleAuthFailure);
    };
  }, []);const checkExistingSession = async () => {
    try {
      // Check if we have tokens in localStorage
      if (apiService.isAuthenticated()) {
        // Verify token with server
        const verificationResponse = await apiService.verifyToken();
        if (verificationResponse.authenticated && verificationResponse.user) {
          setUser({
            username: verificationResponse.user,
            role: verificationResponse.role || 'user',
            permissions: verificationResponse.permissions || []
          });
        } else {
          // Token is invalid, clear it
          await apiService.logout();
        }
      }
    } catch (error) {
      console.error('Session validation error:', error);
      await apiService.logout();
    } finally {
      setIsLoading(false);
    }
  };  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      console.log('=== AUTHENTICATION ATTEMPT ===');
      console.log('Username:', username);
      console.log('Attempting to authenticate with backend API...');
      
      // Validate credentials before sending
      if (!username || !password) {
        console.error('Missing username or password');
        return false;
      }
      
      // Use actual authentication API with JWT support
      const response = await apiService.authenticate({ 
        username: username.trim(), 
        password: password.trim() 
      });
      
      console.log('Authentication response received:', response);
      
      if (response && response.authenticated && response.user && response.access_token) {
        const userData = { 
          username: response.user, 
          role: response.role || 'user',
          name: response.user,
          permissions: [] // Will be loaded from token verification
        };
        
        setUser(userData);
        
        console.log('JWT Authentication successful:', userData);
        console.log('Access token expires in:', response.expires_in, 'seconds');
        return true;
      } else {
        console.log('Authentication failed:', response?.error || 'Invalid credentials');
        return false;
      }
    } catch (error) {
      console.error('Authentication error details:', error);
      return false;
    }
  };
  const logout = async (): Promise<void> => {
    try {
      // Call API logout to blacklist JWT token
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state regardless of API call result
      setUser(null);
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
