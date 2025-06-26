// const API_BASE_URL = 'http://localhost:5000'; // Changed to localhost for local testing
const API_BASE_URL = 'http://ag.api.deepthoughtconsultech.com:5000'; // Original remote server

class ApiService {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    // Load tokens from localStorage on initialization
    this.loadTokensFromStorage();
  }

  private loadTokensFromStorage(): void {
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }

  private saveTokensToStorage(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  private clearTokensFromStorage(): void {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
  }

  private getAuthHeaders(): Record<string, string> {
    if (this.accessToken) {
      return {
        'Authorization': `Bearer ${this.accessToken}`
      };
    }
    return {};
  }

  public isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  public async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/sailing/refresh`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.refreshToken}`
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.accessToken = data.access_token;
        localStorage.setItem('access_token', data.access_token);
        return true;
      } else {
        // Refresh token is invalid, clear all tokens
        this.clearTokensFromStorage();
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokensFromStorage();
      return false;
    }
  }

  private sanitizeJsonString(jsonString: string): string {
    // Replace various invalid JSON values with valid ones
    return jsonString
      .replace(/:\s*NaN/g, ': null')           // NaN -> null
      .replace(/:\s*Infinity/g, ': null')      // Infinity -> null
      .replace(/:\s*-Infinity/g, ': null')     // -Infinity -> null
      .replace(/:\s*undefined/g, ': null');    // undefined -> null
  }  private async request<T>(endpoint: string, options: RequestInit = {}, retryOnAuth = true): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const isDevelopment = import.meta.env.DEV;
    
    try {
      if (isDevelopment) {
        console.log(`API Request: ${options.method || 'GET'} ${url}`);
      }

      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          ...this.getAuthHeaders(), // Add JWT token
          ...options.headers,
        },
        ...options,
      });

      if (isDevelopment) {
        console.log(`Response status: ${response.status} ${response.statusText}`);
      }      // Handle token expiration
      if (response.status === 401 && retryOnAuth) {
        const errorData = await response.json().catch(() => ({}));
        
        if (errorData.code === 'token_expired') {
          // Try to refresh token
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            // Retry the request with new token
            return this.request<T>(endpoint, options, false);
          }
        }
        
        // Token refresh failed or other auth error, clear tokens
        this.clearTokensFromStorage();
        
        // Emit a custom event that AuthContext can listen to
        window.dispatchEvent(new CustomEvent('auth-failure'));
        
        throw new Error('Authentication required');
      }

      if (!response.ok) {
        const errorText = await response.text();
        if (isDevelopment) {
          console.error(`API Error ${response.status}:`, errorText);
        }
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // Get response text first to sanitize invalid JSON values
      const responseText = await response.text();
      if (isDevelopment) {
        console.log(`Raw API Response for ${endpoint}:`, responseText);
      }
      
      // Sanitize the response to fix invalid JSON values
      const sanitizedText = this.sanitizeJsonString(responseText);
      
      let data;
      try {
        data = JSON.parse(sanitizedText);
      } catch (parseError) {
        if (isDevelopment) {
          console.error(`JSON Parse Error for ${endpoint}:`, parseError);
          console.error('Original text:', responseText);
          console.error('Sanitized text:', sanitizedText);
        }
        throw new Error(`Invalid JSON response from ${endpoint}: ${parseError}`);
      }
      
      if (isDevelopment) {
        console.log(`API Response for ${endpoint}:`, data);
      }
      return data;
    } catch (error) {
      if (isDevelopment) {
        console.error(`API Request failed for ${endpoint}:`, error);
        
        if (error instanceof TypeError && error.message.includes('fetch')) {
          console.error('Network error - check if backend is running and CORS is configured correctly');
          console.error('Backend URL:', this.baseUrl);
        }
      }
      throw error;
    }
  }  async authenticate(credentials: { username: string; password: string }) {
    const isDevelopment = import.meta.env.DEV;
    
    if (isDevelopment) {
      console.log('=== AUTHENTICATION API CALL ===');
      console.log('API Base URL:', this.baseUrl);
      console.log('Credentials being sent:', { username: credentials.username });
    }
    
    try {
      const result = await this.request<{
        authenticated: boolean;
        user?: string;
        role?: string;
        access_token?: string;
        refresh_token?: string;
        token_type?: string;
        expires_in?: number;
        error?: string;
      }>('/sailing/auth', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      if (isDevelopment) {
        console.log('=== AUTHENTICATION RESPONSE ===');
        console.log('Authentication result:', result);
      }

      if (result.authenticated && result.access_token && result.refresh_token) {
        // Save tokens and user info
        this.saveTokensToStorage(result.access_token, result.refresh_token);
        
        // Save user info
        if (result.user) {
          localStorage.setItem('user', result.user);
        }
        if (result.role) {
          localStorage.setItem('role', result.role);
        }

        if (isDevelopment) {
          console.log('JWT tokens saved successfully');
          console.log('Access token expires in:', result.expires_in, 'seconds');
        }
      }

      return result;
    } catch (error) {
      if (isDevelopment) {
        console.error('=== AUTHENTICATION ERROR ===');
        console.error('Error details:', error);
      }
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      // Call logout endpoint to blacklist the token
      await this.request('/sailing/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with local cleanup even if API call fails
    } finally {
      // Clear local tokens regardless of API call result
      this.clearTokensFromStorage();
    }
  }

  async verifyToken(): Promise<{
    authenticated: boolean;
    user?: string;
    role?: string;
    permissions?: string[];
  }> {
    if (!this.accessToken) {
      return { authenticated: false };
    }

    try {
      const result = await this.request<{
        authenticated: boolean;
        user?: string;
        role?: string;
        permissions?: string[];
        expires_at?: number;
      }>('/sailing/verify');      return result;
    } catch (error) {
      console.error('Token verification failed:', error);
      this.clearTokensFromStorage();
      return { authenticated: false };
    }
  }

  async getFleets() {
    return this.request<{ status: string; data: Array<{ fleet: string; ships: string[] }> }>('/sailing/fleets');
  }

  async getMetrics() {
    return this.request<{ status: string; data: string[] }>('/sailing/metrics');
  }

  async getSheets() {
    return this.request<{ status: string; data: string[] }>('/sailing/sheets');
  }

  async getRatingSummary(filters: any) {
    return this.request<{ status: string; count: number; data: any[] }>('/sailing/getRatingSmry', {
      method: 'POST',
      body: JSON.stringify(filters),
    });
  }
  async getMetricRating(data: any) {
    return this.request<{ 
      status: string; 
      metric: string;
      results: Array<{
        ship: string;
        sailingNumber: string;
        metric: string;
        averageRating: number;
        ratingCount: number;
        filteredReviews: string[];
        filteredComments: string[];
        filteredMetric: number[];
        filteredCount: number;
        comparisonToOverall?: number;
        error?: string;
      }>;
      filterLower?: number;
      filterUpper?: number;
      comparedToAverage: boolean;
    }>('/sailing/getMetricRating', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async semanticSearch(searchData: any) {
    return this.request<{ 
      status: string; 
      results: Array<{
        comment: string;
        sheet_name: string;
        meal_time: string;
        metadata: {
          fleet: string;
          ship: string;
          sailing_number: string;
          date: string;
        };
      }>;
    }>('/sailing/semanticSearch', {
      method: 'POST',
      body: JSON.stringify(searchData),
    });
  }  async getIssuesSummary(filters: any) {
    const isDevelopment = import.meta.env.DEV;
    if (isDevelopment) {
      console.log('API: Calling getIssuesList endpoint with filters:', filters);
    }
    return this.request<{ 
      status: string; 
      data: any; // Handle any data structure from endpoint
    }>('/sailing/getIssuesList', {
      method: 'POST',
      body: JSON.stringify(filters),
    });
  }

  async getShips() {
    return this.request<{ 
      status: string; 
      data: Array<{
        name: string;
        id: number;
      }>;
    }>('/sailing/ships');
  }

  async checkConnection() {
    return this.request<string>('/sailing/check');
  }

  async getSailingNumbers() {
    return this.request<{ status: string; data: string[] }>('/sailing/sailing_numbers');
  }

  async getSailingNumbersFiltered(filters: { ships: string[], start_date: string, end_date: string }) {
    return this.request<{ status: string; data: string[] }>('/sailing/sailing_numbers_filter', {
      method: 'POST',
      body: JSON.stringify(filters),
    });
  }

  // User Management API methods
  async addUser(userData: { username: string; password: string; role?: string }) {
    return this.request<{ 
      status: string; 
      message: string; 
      user?: { username: string; role: string }; 
    }>('/sailing/admin/add-user', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async resetUserPassword(resetData: { username: string; new_password: string }) {
    return this.request<{ 
      status: string; 
      message: string; 
    }>('/sailing/admin/reset-password', {
      method: 'POST',
      body: JSON.stringify(resetData),
    });
  }

  async resetOwnPassword(passwordData: { current_password: string; new_password: string }) {
    return this.request<{ 
      status: string; 
      message: string; 
    }>('/sailing/reset-own-password', {
      method: 'POST',
      body: JSON.stringify(passwordData),
    });
  }

  async listUsers() {
    return this.request<{ 
      status: string; 
      data: Array<{ username: string; role: string }>; 
    }>('/sailing/admin/list-users');
  }

  async getPersonnelList(filters: any) {
    const isDevelopment = import.meta.env.DEV;
    if (isDevelopment) {
      console.log('API: Calling getPersonnelList endpoint with filters:', filters);
    }
    return this.request<{ 
      status: string; 
      results: Array<{
        sailingNumber: string;
        crewMentions: Array<{
          crewName: string;
          sentiments: Array<{
            sentiment: string;
            mentions: Array<{
              sheetName: string;
              commentSnippet: string;
              comment: string;
            }>;
          }>;
        }>;
      }>
    }>('/sailing/getPersonnelList', {
      method: 'POST',
      body: JSON.stringify(filters),
    });
  }
}

export const apiService = new ApiService();
