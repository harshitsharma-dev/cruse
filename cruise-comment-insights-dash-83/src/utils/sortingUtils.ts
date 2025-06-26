/**
 * Utility functions for sorting data in table/list views
 */

export type SortDirection = 'asc' | 'desc';
export type SortConfig = {
  key: string;
  direction: SortDirection;
};

/**
 * Generic sorting function for arrays of objects
 */
export const sortData = <T extends Record<string, any>>(
  data: T[],
  sortConfig: SortConfig | null,
  pageType?: string
): T[] => {
  if (!sortConfig) return data;

  return [...data].sort((a, b) => {
    const aValue = getNestedValue(a, sortConfig.key);
    const bValue = getNestedValue(b, sortConfig.key);
    
    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
    if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
    
    // Sort strings
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const result = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
      return sortConfig.direction === 'asc' ? result : -result;
    }
    
    // Sort numbers
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      const result = aValue - bValue;
      return sortConfig.direction === 'asc' ? result : -result;
    }
    
    // Sort dates
    if (aValue instanceof Date && bValue instanceof Date) {
      const result = aValue.getTime() - bValue.getTime();
      return sortConfig.direction === 'asc' ? result : -result;
    }
    
    // Convert to strings as fallback
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();
    const result = aStr.localeCompare(bStr);
    return sortConfig.direction === 'asc' ? result : -result;
  });
};

/**
 * Get nested object value using dot notation (e.g., 'ship.name')
 */
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

/**
 * Toggle sort direction or set new sort key
 */
export const toggleSort = (
  currentSort: SortConfig | null,
  newKey: string
): SortConfig => {
  if (!currentSort || currentSort.key !== newKey) {
    return { key: newKey, direction: 'asc' };
  }
  return {
    key: newKey,
    direction: currentSort.direction === 'asc' ? 'desc' : 'asc'
  };
};

/**
 * Search/Results page sort options
 */
export const SEARCH_SORT_OPTIONS = [
  { key: 'similarity_score', label: 'Similarity Score' },
  { key: 'ship_name', label: 'Ship Name' },
  { key: 'sailing_number', label: 'Sailing Number' },
  { key: 'sheet_name', label: 'Category' },
  { key: 'start_date', label: 'Date' }
] as const;

/**
 * Issues page sort options
 */
export const ISSUES_SORT_OPTIONS = [
  { key: 'ship_name', label: 'Ship Name' },
  { key: 'issue_count', label: 'Issue #' }
] as const;

/**
 * Metric Filter page sort options for sailing-level sorting
 */
export const METRIC_SAILING_SORT_OPTIONS = [
  { key: 'ship', label: 'Ship Name' }
] as const;

/**
 * Metric Filter page sort options for comment-level sorting
 */
export const METRIC_COMMENT_SORT_OPTIONS = [
  { key: 'rating', label: 'Comment Rating' }
] as const;

/**
 * Rating Summary sort options
 */
export const RATING_SUMMARY_SORT_OPTIONS = [
  { key: 'ship_name', label: 'Ship Name' },
  { key: 'sailing_number', label: 'Sailing Number' },
  { key: 'overall_rating', label: 'Overall Rating' },
  { key: 'total_responses', label: 'Total Responses' },
  { key: 'start_date', label: 'Start Date' }
] as const;

/**
 * Personnel page sort options
 */
export const PERSONNEL_SORT_OPTIONS = [
  { key: 'ship_name', label: 'Ship Name' },
  { key: 'sailing_number', label: 'Sailing Number' },
  { key: 'issue_count', label: 'Issue Count' },
  { key: 'start_date', label: 'Date' }
] as const;
