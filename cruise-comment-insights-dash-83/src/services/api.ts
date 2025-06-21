// const API_BASE_URL = 'http://localhost:5000'; // Changed to localhost for local testing
const API_BASE_URL = 'http://ag.api.deepthoughtconsultech.com:5000'; // Original remote server

import CryptoService from './crypto';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private sanitizeJsonString(jsonString: string): string {
    // Replace various invalid JSON values with valid ones
    return jsonString
      .replace(/:\s*NaN/g, ': null')           // NaN -> null
      .replace(/:\s*Infinity/g, ': null')      // Infinity -> null
      .replace(/:\s*-Infinity/g, ': null')     // -Infinity -> null
      .replace(/:\s*undefined/g, ': null');    // undefined -> null
  }  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const isDevelopment = import.meta.env.DEV;
    
    try {
      if (isDevelopment) {
        console.log(`API Request: ${options.method || 'GET'} ${url}`);
        console.log('Request headers:', {
          'Content-Type': 'application/json',
          ...options.headers,
        });
        if (options.body) {
          console.log('Request body:', options.body);
          console.log('Request body type:', typeof options.body);
        }
      }
        const response = await fetch(url, {
        mode: 'cors',
        credentials: 'include', // Add credentials for CORS
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br', // Request compressed responses
          'Cache-Control': 'no-cache',
          ...options.headers,
        },
        ...options,
      });

      if (isDevelopment) {
        console.log(`Response status: ${response.status} ${response.statusText}`);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
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
        
        // Add more detailed error information
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
      console.log('Original credentials:', { username: credentials.username, password: '[REDACTED]' });
    }
    
    try {
      // Debug Web Crypto API availability
      if (isDevelopment) {
        console.log('Web Crypto API checks:');
        console.log('- window.crypto:', typeof window.crypto);
        console.log('- crypto.subtle:', typeof window.crypto?.subtle);
        console.log('- crypto.getRandomValues:', typeof window.crypto?.getRandomValues);
        console.log('- CryptoService:', typeof CryptoService);
      }
      
      // Encrypt the credentials before sending
      console.log('Calling CryptoService.encryptCredentials...');
      const encryptedPayload = await CryptoService.encryptCredentials(credentials);
      console.log('✅ Encryption successful!');
      
      if (isDevelopment) {
        console.log('Encrypted payload structure:', {
          hasEncryptedData: !!encryptedPayload.encryptedData,
          hasIV: !!encryptedPayload.iv,
          hasSessionKey: !!encryptedPayload.sessionKey,
          encryptedDataLength: encryptedPayload.encryptedData.length,
        });
      }
      
      // Send encrypted data to the server
      const requestBody = JSON.stringify({
        encrypted: true,
        ...encryptedPayload
      });
      
      if (isDevelopment) {
        console.log('Request body length:', requestBody.length);
        console.log('Sending encrypted authentication request...');
        console.log('Request payload keys:', Object.keys(JSON.parse(requestBody)));
      }
      
      const result = await this.request<{
        authenticated: boolean;
        user?: string;
        role?: string;
        error?: string;
      }>('/sailing/auth', {
        method: 'POST',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Encryption-Enabled': 'true', // Signal to backend that data is encrypted
        },
      });
      
      if (isDevelopment) {
        console.log('Authentication result:', result);
      }
      return result;
    } catch (error) {
      if (isDevelopment) {
        console.error('Authentication API error:', error);
        
        // Log additional debug info
        if (error instanceof Error) {
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
      }
      
      throw error;
    }
  }

  // Fallback authentication method (non-encrypted) for backwards compatibility
  async authenticateUnencrypted(credentials: { username: string; password: string }) {
    const isDevelopment = import.meta.env.DEV;
    
    if (isDevelopment) {
      console.log('=== FALLBACK AUTHENTICATION (UNENCRYPTED) ===');
      console.log('API Base URL:', this.baseUrl);
      console.log('Using unencrypted credentials for backwards compatibility');
    }
    
    const requestBody = JSON.stringify(credentials);
    
    try {
      const result = await this.request<{
        authenticated: boolean;
        user?: string;
        role?: string;
        error?: string;
      }>('/sailing/auth', {
        method: 'POST',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });
      
      if (isDevelopment) {
        console.log('Fallback authentication result:', result);
      }
      return result;
    } catch (error) {
      if (isDevelopment) {
        console.error('Fallback authentication error:', error);
      }
      throw error;
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
        filteredMetric: number[];
        filteredCount: number;
        comparisonToOverall?: number;
        error?: string;
      }>;
      filterBelow?: number;
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

  async logout() {
    // For now, just return success as logout is handled client-side
    // In the future, this could invalidate server-side sessions
    const isDevelopment = import.meta.env.DEV;
    
    if (isDevelopment) {
      console.log('Logout called - clearing client-side session');
    }
    
    return { success: true };
  }

  async validateSession() {
    // For now, return false as we don't have server-side session validation
    // In the future, this could check server-side session validity
    const isDevelopment = import.meta.env.DEV;
    
    if (isDevelopment) {
      console.log('validateSession called - no server-side session validation implemented');
    }
    
    return { valid: false };
  }
}

export const apiService = new ApiService();
