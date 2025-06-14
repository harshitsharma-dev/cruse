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
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFleetData = async () => {
      try {
        const response = await apiService.getFleets();
        setAvailableFleets(response.data);
      } catch (error) {
        console.error('Failed to load fleet data:', error);
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
    if (filterState.fleets.length === 0) {
      return availableFleets.flatMap(fleet => 
        fleet.ships.map(ship => `${fleet.fleet}:${ship}`)
      );
    }
    
    return availableFleets
      .filter(fleet => filterState.fleets.includes(fleet.fleet))
      .flatMap(fleet => fleet.ships.map(ship => `${fleet.fleet}:${ship}`));
  }, [filterState.fleets, availableFleets]);

  return (
    <FilterContext.Provider value={{
      filterState,
      setFilterState,
      resetFilters,
      availableFleets,
      availableShips,
      isLoading
    }}>
      {children}
    </FilterContext.Provider>
  );
};