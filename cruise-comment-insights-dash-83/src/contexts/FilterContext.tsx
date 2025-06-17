import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface FilterState {
  fleets: string[];
  ships: string[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
  sailingNumbers: string[];
}

interface FilterContextType {
  filterState: FilterState;
  setFilterState: (state: Partial<FilterState>) => void;
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

const defaultFilterState: FilterState = {
  fleets: [],
  ships: [],
  dateRange: {
    startDate: '',
    endDate: ''
  },
  sailingNumbers: []
};

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filterState, setFilterStateInternal] = useState<FilterState>(defaultFilterState);
  const [availableFleets, setAvailableFleets] = useState<Array<{ fleet: string; ships: string[] }>>([]);
  const [availableSailingNumbers, setAvailableSailingNumbers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSailingNumbersLoading, setIsSailingNumbersLoading] = useState(false);

  useEffect(() => {
    const loadFleetData = async () => {
      try {
        const response = await apiService.getFleets();
        // Ensure the response data is properly formatted
        const fleetData = Array.isArray(response.data) ? response.data : [];
        // Ensure each fleet has a ships array
        const sanitizedFleetData = fleetData.map(fleet => ({
          ...fleet,
          ships: Array.isArray(fleet.ships) ? fleet.ships : []
        }));
        setAvailableFleets(sanitizedFleetData);
      } catch (error) {
        console.error('Failed to load fleet data:', error);
        setAvailableFleets([]); // Ensure it's always an array
      } finally {
        setIsLoading(false);
      }
    };

    loadFleetData();
  }, []);

  const setFilterState = (newState: Partial<FilterState>) => {
    setFilterStateInternal(prev => ({ ...prev, ...newState }));
  };

  const resetFilters = () => {
    setFilterStateInternal(defaultFilterState);
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
      const response = await apiService.getSailingNumbersFiltered({
        ships: ships,
        start_date: startDate,
        end_date: endDate
      });
      const sailingNumbers = Array.isArray(response.data) ? response.data : [];
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