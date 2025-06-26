/**
 * Common filter utilities for consistent API data formatting across all pages
 */

export interface StandardFilters {
  ships: string[];
  fleets: string[];
  start_date: string;
  end_date: string;
  sailing_numbers: string[];
  useAllDates: boolean;
}

export interface BasicFilterState {
  fleets: string[];
  ships: string[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
  sailingNumbers: string[];
  useAllDates?: boolean;
}

/**
 * Convert basic filter state to standardized API format
 */
export const convertToStandardFilters = (filters: BasicFilterState): StandardFilters => {
  return {
    ships: (filters.ships || []).map(ship => {
      // Remove fleet prefix if present (e.g., "marella:explorer" -> "explorer")
      return ship.includes(':') ? ship.split(':')[1] : ship;
    }),
    fleets: filters.fleets || [],
    start_date: filters.useAllDates ? "-1" : (filters.dateRange?.startDate || "-1"),
    end_date: filters.useAllDates ? "-1" : (filters.dateRange?.endDate || "-1"),
    sailing_numbers: filters.sailingNumbers || [],
    useAllDates: filters.useAllDates || false
  };
};

/**
 * Legacy format conversion for backward compatibility
 */
export const convertToLegacyFormat = (filters: BasicFilterState) => {
  return {
    ships: (filters.ships || []).map(ship => {
      return ship.includes(':') ? ship.split(':')[1] : ship;
    }),
    fleets: filters.fleets || [],
    fromDate: filters.dateRange?.startDate || '',
    toDate: filters.dateRange?.endDate || '',
    sailingNumbers: filters.sailingNumbers || [],
    useAllDates: filters.useAllDates || false
  };
};

/**
 * Create API request data for Issues/Personnel endpoints
 */
export const createIssuesApiData = (
  filters: BasicFilterState, 
  sheets: string[] = []
) => {
  const standardFilters = convertToStandardFilters(filters);
  
  return {
    ships: standardFilters.ships.length > 0 ? standardFilters.ships : [],
    sailing_numbers: standardFilters.sailing_numbers.length > 0 ? standardFilters.sailing_numbers : [],
    sheets: sheets.length > 0 ? sheets : [],
    start_date: standardFilters.start_date,
    end_date: standardFilters.end_date,
    fleets: standardFilters.fleets
  };
};

/**
 * Create API request data for Search endpoints
 */
export const createSearchApiData = (
  filters: BasicFilterState,
  query: string,
  options: {
    sheet_names?: string[];
    meal_time?: string;
    semanticSearch?: boolean;
    similarity_score_range?: number[];
    num_results?: number;
  } = {}
) => {
  const standardFilters = convertToStandardFilters(filters);
  
  return {
    query,
    ships: standardFilters.ships,
    fleets: standardFilters.fleets,
    start_date: standardFilters.start_date,
    end_date: standardFilters.end_date,
    sailing_numbers: standardFilters.sailing_numbers.length > 0 ? standardFilters.sailing_numbers : [],
    sheet_names: options.sheet_names || [],    meal_time: options.meal_time,
    semanticSearch: options.semanticSearch || false,
    similarity_score_range: options.similarity_score_range || [0, 1],
    num_results: options.num_results || 10
  };
};

/**
 * Create API request data for Rating Summary endpoints
 */
export const createRatingSummaryApiData = (filters: BasicFilterState) => {
  const standardFilters = convertToStandardFilters(filters);
  
  return {
    ships: standardFilters.ships,
    fleets: standardFilters.fleets,
    start_date: standardFilters.start_date,
    end_date: standardFilters.end_date,
    sailing_numbers: standardFilters.sailing_numbers
  };
};

/**
 * Create API request data for Metric Rating endpoints
 */
export const createMetricRatingApiData = (
  filters: BasicFilterState,
  metric: string,
  options: {
    filterLower?: number;
    filterUpper?: number;
    compareToAverage?: boolean;
  } = {}
) => {
  const standardFilters = convertToStandardFilters(filters);
  
  return {
    metric,
    ships: standardFilters.ships,
    start_date: standardFilters.start_date,
    end_date: standardFilters.end_date,
    sailing_numbers: standardFilters.sailing_numbers,
    filterLower: options.filterLower,
    filterUpper: options.filterUpper,
    compareToAverage: options.compareToAverage || false
  };
};

/**
 * Default filter state that can be used across components
 */
export const getDefaultFilterState = (): BasicFilterState => {
  // Set default date range to last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);
  
  return {
    fleets: [],
    ships: [],
    dateRange: {
      startDate: startDate.toISOString().split('T')[0], // YYYY-MM-DD format
      endDate: endDate.toISOString().split('T')[0]
    },
    sailingNumbers: [],
    useAllDates: false // Default to specific date range, not all dates
  };
};

/**
 * Check if filters are empty/default
 */
export const areFiltersEmpty = (filters: BasicFilterState): boolean => {
  return (
    (!filters.fleets || filters.fleets.length === 0) &&
    (!filters.ships || filters.ships.length === 0) &&
    (!filters.sailingNumbers || filters.sailingNumbers.length === 0) &&
    (!filters.dateRange?.startDate || filters.dateRange.startDate === '') &&
    (!filters.dateRange?.endDate || filters.dateRange.endDate === '')
  );
};

/**
 * Debug function to log filter states
 */
export const debugFilters = (label: string, filters: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`=== ${label} ===`);
    console.log('Raw filters:', filters);
    if (filters && typeof filters === 'object') {
      console.log('Ships:', filters.ships);
      console.log('Fleets:', filters.fleets);
      console.log('Date range:', filters.dateRange || filters);
      console.log('Sailing numbers:', filters.sailingNumbers);
      console.log('Use all dates:', filters.useAllDates);
    }
    console.log('===================');
  }
};

/**
 * Helper function to format ship names consistently in uppercase
 */
export const formatShipName = (shipName: string | null | undefined): string => {
  if (!shipName) return 'Unknown';
  return shipName.toUpperCase();
};
