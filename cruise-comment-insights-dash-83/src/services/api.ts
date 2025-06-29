// const API_BASE_URL = 'http://localhost:5000'; // Changed to localhost for local testing
const API_BASE_URL = 'http://ag.api.deepthoughtconsultech.com'; // Original remote server

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
  }
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      console.log(`API Request: ${options.method || 'GET'} ${url}`);
      if (options.body) {
        console.log('Request body:', options.body);
      }
      
      const response = await fetch(url, {
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error ${response.status}:`, errorText);
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }      // Get response text first to sanitize invalid JSON values
      const responseText = await response.text();
      console.log(`Raw API Response for ${endpoint}:`, responseText);
      
      // Sanitize the response to fix invalid JSON values
      const sanitizedText = this.sanitizeJsonString(responseText);
      
      let data;
      try {
        data = JSON.parse(sanitizedText);
      } catch (parseError) {
        console.error(`JSON Parse Error for ${endpoint}:`, parseError);
        console.error('Original text:', responseText);
        console.error('Sanitized text:', sanitizedText);
        throw new Error(`Invalid JSON response from ${endpoint}: ${parseError}`);
      }
      
      console.log(`API Response for ${endpoint}:`, data);
      return data;
    } catch (error) {
      console.error(`API Request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async authenticate(credentials: { username: string; password: string }) {
    return this.request<{
      authenticated: boolean;
      user?: string;
      role?: string;
      error?: string;
    }>('/sailing/auth', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
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
    console.log('API: Calling getIssuesList endpoint with filters:', filters);
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
}

export const apiService = new ApiService();
