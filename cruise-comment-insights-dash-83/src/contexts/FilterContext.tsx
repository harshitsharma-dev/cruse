import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { BasicFilterState, getDefaultFilterState } from '../utils/filterUtils';

interface FilterContextType {
  filterState: BasicFilterState;
  setFilterState: (state: Partial<BasicFilterState>) => void;
  resetFilters: () => void;
  availableFleets: Array<{ fleet: string; ships: string[] }>;
  availableShips: string[];
  availableSailingNumbers: string[];
  loadSailingNumbers: (ships: string[], startDate: string, endDate: string) => Promise<void>;
  isLoading: boolean;
  isSailingNumbersLoading: boolean;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const useFilter = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
};

const FILTER_STORAGE_KEY = 'cruise-analytics-filters';

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state with persisted filters or defaults (using sessionStorage)
  const [filterState, setFilterStateInternal] = useState<BasicFilterState>(() => {
    try {
      const saved = sessionStorage.getItem(FILTER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure the parsed data has all required properties
        return {
          ...getDefaultFilterState(),
          ...parsed
        };
      }
    } catch (error) {
      console.warn('Failed to load saved filters:', error);
    }
    return getDefaultFilterState();
  });
  const [availableFleets, setAvailableFleets] = useState<Array<{ fleet: string; ships: string[] }>>([]);
  const [availableSailingNumbers, setAvailableSailingNumbers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSailingNumbersLoading, setIsSailingNumbersLoading] = useState(false);
  useEffect(() => {
    const loadFleetData = async () => {
      try {
        console.log('Loading fleet data after authentication...');
        const response = await apiService.getFleets();
        // Ensure the response data is properly formatted
        const fleetData = Array.isArray(response.data) ? response.data : [];
        // Ensure each fleet has a ships array
        const sanitizedFleetData = fleetData.map(fleet => ({
          ...fleet,
          ships: Array.isArray(fleet.ships) ? fleet.ships : []
        }));
        setAvailableFleets(sanitizedFleetData);
        console.log('Fleet data loaded successfully:', sanitizedFleetData);
      } catch (error) {
        console.error('Failed to load fleet data:', error);
        // Check if it's an authentication error
        if (error instanceof Error && error.message.includes('Authentication required')) {
          console.log('Authentication error detected in FilterContext');
          // Don't set empty fleets, let the auth system handle the redirect
          return;
        }
        setAvailableFleets([]); // Ensure it's always an array for other errors
      } finally {
        setIsLoading(false);
      }
    };

    loadFleetData();
  }, []);

  // Cleanup effect to handle page navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clear filters on page reload/close
      try {
        sessionStorage.removeItem(FILTER_STORAGE_KEY);
      } catch (error) {
        console.warn('Failed to clear filters on page unload:', error);
      }
    };

    // Add event listener for page unload
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const setFilterState = (newState: Partial<BasicFilterState>) => {
    const updatedState = { ...filterState, ...newState };
    setFilterStateInternal(updatedState);
    
    // Persist to sessionStorage (only for current browser session)
    try {
      sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(updatedState));
    } catch (error) {
      console.warn('Failed to save filters to sessionStorage:', error);
    }
  };

  const resetFilters = () => {
    const defaultState = getDefaultFilterState();
    setFilterStateInternal(defaultState);
    
    // Clear from sessionStorage
    try {
      sessionStorage.removeItem(FILTER_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear filters from sessionStorage:', error);
    }
  };
  const availableShips = React.useMemo(() => {
    if (!availableFleets || availableFleets.length === 0) {
      return [];
    }
    
    if (filterState.fleets.length === 0) {
      return availableFleets.flatMap(fleet => 
        (fleet.ships || []).map(ship => `${fleet.fleet}:${ship}`)
      );
    }
    
    return availableFleets
      .filter(fleet => filterState.fleets.includes(fleet.fleet))
      .flatMap(fleet => (fleet.ships || []).map(ship => `${fleet.fleet}:${ship}`));
  }, [filterState.fleets, availableFleets]);
  const loadSailingNumbers = async (ships: string[], startDate: string, endDate: string) => {
    try {
      setIsSailingNumbersLoading(true);
      
      // Add validation to prevent empty requests
      if (!ships || ships.length === 0) {
        console.log('No ships selected, skipping sailing numbers load');
        setAvailableSailingNumbers([]);
        return;
      }

      console.log('Loading sailing numbers with:', { ships, startDate, endDate });
      
      const response = await apiService.getSailingNumbersFiltered({
        ships: ships,
        start_date: startDate,
        end_date: endDate
      });
      
      const sailingNumbers = Array.isArray(response.data) ? response.data : [];
      console.log('Sailing numbers loaded:', sailingNumbers);
      setAvailableSailingNumbers(sailingNumbers);
    } catch (error) {
      console.error('Failed to load sailing numbers:', error);
      setAvailableSailingNumbers([]);
    } finally {
      setIsSailingNumbersLoading(false);
    }
  };
  return (
    <FilterContext.Provider value={{
      filterState,
      setFilterState,
      resetFilters,
      availableFleets,
      availableShips,
      availableSailingNumbers,
      loadSailingNumbers,
      isLoading,
      isSailingNumbersLoading
    }}>
      {children}
    </FilterContext.Provider>
  );
};