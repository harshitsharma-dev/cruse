// API Service for Apollo Intelligence Cruise Analytics
// Handles authentication, session management, and data fetching

export interface User {
  id: string;
  username: string;
  email?: string;
  role: 'superadmin' | 'admin' | 'user';
  permissions: string[];
  created_at?: string;
  last_login?: string;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  message?: string;
  error?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    // Use environment variable or fallback to localhost
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      credentials: 'include', // Include cookies for session management
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Authentication Methods
  async authenticate(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await this.request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      return response;
    } catch (error) {
      console.error('Authentication failed:', error);
      return {
        success: false,
        error: 'Authentication failed. Please check your credentials.',
      };
    }
  }

  async logout(): Promise<ApiResponse> {
    try {
      const response = await this.request<ApiResponse>('/auth/logout', {
        method: 'POST',
      });

      return response;
    } catch (error) {
      console.error('Logout failed:', error);
      return {
        success: false,
        error: 'Logout failed.',
      };
    }
  }

  async validateSession(): Promise<{ valid: boolean; user?: User }> {
    try {
      const response = await this.request<{ valid: boolean; user?: User }>('/auth/validate');
      return response;
    } catch (error) {
      console.error('Session validation failed:', error);
      return { valid: false };
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await this.request<{ user: User }>('/auth/user');
      return response.user || null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  // User Management Methods (for admin/superadmin)
  async getUsers(): Promise<User[]> {
    try {
      const response = await this.request<{ users: User[] }>('/admin/users');
      return response.users || [];
    } catch (error) {
      console.error('Failed to get users:', error);
      return [];
    }
  }

  async createUser(userData: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const response = await this.request<ApiResponse<User>>('/admin/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      return response;
    } catch (error) {
      console.error('Failed to create user:', error);
      return {
        success: false,
        error: 'Failed to create user.',
      };
    }
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const response = await this.request<ApiResponse<User>>(`/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      });

      return response;
    } catch (error) {
      console.error('Failed to update user:', error);
      return {
        success: false,
        error: 'Failed to update user.',
      };
    }
  }

  async deleteUser(userId: string): Promise<ApiResponse> {
    try {
      const response = await this.request<ApiResponse>(`/admin/users/${userId}`, {
        method: 'DELETE',
      });

      return response;
    } catch (error) {
      console.error('Failed to delete user:', error);
      return {
        success: false,
        error: 'Failed to delete user.',
      };
    }
  }

  // Data Fetching Methods
  async getCruiseData(filters?: any): Promise<any[]> {
    try {
      const queryString = filters ? `?${new URLSearchParams(filters).toString()}` : '';
      const response = await this.request<{ data: any[] }>(`/api/cruise-data${queryString}`);
      return response.data || [];
    } catch (error) {
      console.error('Failed to get cruise data:', error);
      return [];
    }
  }

  async getRatingsData(filters?: any): Promise<any[]> {
    try {
      const queryString = filters ? `?${new URLSearchParams(filters).toString()}` : '';
      const response = await this.request<{ data: any[] }>(`/api/ratings${queryString}`);
      return response.data || [];
    } catch (error) {
      console.error('Failed to get ratings data:', error);
      return [];
    }
  }

  async getShipData(): Promise<any[]> {
    try {
      const response = await this.request<{ ships: any[] }>('/api/ships');
      return response.ships || [];
    } catch (error) {
      console.error('Failed to get ship data:', error);
      return [];
    }
  }

  async getSailingData(filters?: any): Promise<any[]> {
    try {
      const queryString = filters ? `?${new URLSearchParams(filters).toString()}` : '';
      const response = await this.request<{ sailings: any[] }>(`/api/sailings${queryString}`);
      return response.sailings || [];
    } catch (error) {
      console.error('Failed to get sailing data:', error);
      return [];
    }
  }

  // Permission checking
  async checkPermission(permission: string): Promise<boolean> {
    try {
      const response = await this.request<{ hasPermission: boolean }>(`/auth/permission/${permission}`);
      return response.hasPermission;
    } catch (error) {
      console.error('Failed to check permission:', error);
      return false;
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.request<{ status: string }>('/health');
      return response.status === 'ok';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
