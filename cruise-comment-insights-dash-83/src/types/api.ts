
export interface Fleet {
  fleet: string;
  ships: string[];
}

export interface AuthRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  authenticated: boolean;
  user?: string;
  role?: string;
  error?: string;
}

export interface User {
  name: string;
  email: string;
  department: string;
  fleet?: string;
  ship?: string;
  role: 'superadmin' | 'admin' | 'user';
}

export interface BasicFilter {
  fleets: string[];
  ships: string[];
  fromDate: string;
  toDate: string;
  sailingNumbers: string[];
}

export interface RatingData {
  "Ship Name": string;
  "Sailing Number": string;
  "Fleet": string;
  "Start": string;
  "End": string;
  [key: string]: any;
}

export interface MetricResult {
  ship: string;
  sailingNumber: string;
  metric: string;
  averageRating: number;
  ratingCount: number;
  filteredReviews: string[];
  filteredMetric: number[];
  filteredCount: number;
  comparisonToOverall?: number;
}

export interface SearchRequest {
  query: string;
  fleets: string[];
  ships: string[];
  filter_params: Record<string, any>;
  sheet_names: string[];
  meal_time?: string;
  semanticSearch: boolean;
  similarity_score_range: [number, number];
  num_results: number;
}

export interface SearchResult {
  comment: string;
  sheet_name: string;
  meal_time: string;
  metadata: {
    fleet: string;
    ship: string;
    sailing_number: string;
    date: string;
  };
}
