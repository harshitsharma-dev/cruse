
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from 'lucide-react';
import { apiService } from '../services/api';
import { useQuery } from '@tanstack/react-query';

interface Fleet {
  fleet: string;
  ships: string[];
}

interface BasicFilterProps {
  onFilterChange: (filters: any) => void;
  currentFilters?: any;
}

const BasicFilter: React.FC<BasicFilterProps> = ({ onFilterChange, currentFilters = {} }) => {
  const [selectedFleets, setSelectedFleets] = useState<string[]>(currentFilters.fleets || []);
  const [selectedShips, setSelectedShips] = useState<string[]>(currentFilters.ships || []);
  const [fromDate, setFromDate] = useState(currentFilters.fromDate || '');
  const [toDate, setToDate] = useState(currentFilters.toDate || '');
  const [useAllDates, setUseAllDates] = useState(currentFilters.useAllDates || false);
  const [selectedSailingNumbers, setSelectedSailingNumbers] = useState<string[]>(currentFilters.sailingNumbers || []);

  // Fetch fleets data from API
  const { data: fleetsData, isLoading: fleetsLoading, error: fleetsError } = useQuery({
    queryKey: ['fleets'],
    queryFn: () => apiService.getFleets(),
    retry: 3,
    retryDelay: 1000,
  });

  useEffect(() => {
    if (fleetsError) {
      console.error('Error loading fleets:', fleetsError);
    }
  }, [fleetsError]);

  const handleFleetChange = (fleet: string, checked: boolean) => {
    const updatedFleets = checked 
      ? [...selectedFleets, fleet]
      : selectedFleets.filter(f => f !== fleet);
    
    setSelectedFleets(updatedFleets);
    
    // Reset ships if fleet is deselected
    if (!checked && fleetsData?.data) {
      const fleetShips = fleetsData.data.find((f: Fleet) => f.fleet === fleet)?.ships || [];
      setSelectedShips(prev => prev.filter(ship => !fleetShips.includes(ship)));
    }
  };

  const handleShipChange = (ship: string, checked: boolean) => {
    const updatedShips = checked 
      ? [...selectedShips, ship]
      : selectedShips.filter(s => s !== ship);
    
    setSelectedShips(updatedShips);
  };

  const getAvailableShips = () => {
    if (!fleetsData?.data) return [];
    
    return fleetsData.data
      .filter((fleet: Fleet) => selectedFleets.includes(fleet.fleet))
      .flatMap((fleet: Fleet) => fleet.ships);
  };
  const handleApplyFilters = () => {
    if (selectedFleets.length === 0) {
      alert('Please select at least one fleet');
      return;
    }

    if (selectedShips.length === 0) {
      alert('Please select at least one ship');
      return;
    }

    if (!useAllDates && (!fromDate || !toDate)) {
      alert('Please select both start and end dates or choose "All Dates"');
      return;
    }

    const filters = {
      fleets: selectedFleets,
      ships: selectedShips,
      fromDate: useAllDates ? '-1' : fromDate,
      toDate: useAllDates ? '-1' : toDate,
      sailingNumbers: selectedSailingNumbers.length > 0 ? selectedSailingNumbers : ['-1'],
      filter_by: useAllDates ? 'all' : 'date',
      useAllDates: useAllDates
    };
    
    console.log('Applying filters:', filters);
    onFilterChange(filters);
  };

  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  if (fleetsLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Basic Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading fleets...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (fleetsError) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Basic Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-red-600">
            <p>Error loading fleets data</p>
            <p className="text-sm">Please check your connection</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Basic Filters
        </CardTitle>
      </CardHeader>      <CardContent className="space-y-6">
        {/* Date Range - Moved to top */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="useAllDates"
              checked={useAllDates}
              onCheckedChange={(checked) => setUseAllDates(checked as boolean)}
            />
            <Label htmlFor="useAllDates" className="text-base font-medium">
              All Dates
            </Label>
          </div>
          
          {!useAllDates && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromDate">Start Date</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="toDate">End Date</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Sailing Number Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Sailing Numbers</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sailing-all"
                checked={selectedSailingNumbers.length === 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedSailingNumbers([]);
                  }
                }}
              />
              <Label htmlFor="sailing-all" className="text-sm">
                All Sailing Numbers
              </Label>
            </div>
            {/* Mock sailing numbers - in real implementation, these would be fetched based on date range */}
            {['SL001', 'SL002', 'SL003', 'SL004', 'SL005'].map((sailing) => (
              <div key={sailing} className="flex items-center space-x-2">
                <Checkbox
                  id={`sailing-${sailing}`}
                  checked={selectedSailingNumbers.includes(sailing)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedSailingNumbers(prev => [...prev, sailing]);
                    } else {
                      setSelectedSailingNumbers(prev => prev.filter(s => s !== sailing));
                    }
                  }}
                />
                <Label htmlFor={`sailing-${sailing}`} className="text-sm">
                  {sailing}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Fleet Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Fleet Selection</Label>
          <div className="grid grid-cols-2 gap-2">
            {fleetsData?.data?.map((fleet: Fleet) => (
              <div key={fleet.fleet} className="flex items-center space-x-2">
                <Checkbox
                  id={`fleet-${fleet.fleet}`}
                  checked={selectedFleets.includes(fleet.fleet)}
                  onCheckedChange={(checked) => 
                    handleFleetChange(fleet.fleet, checked as boolean)
                  }
                />
                <Label htmlFor={`fleet-${fleet.fleet}`} className="text-sm">
                  {capitalizeFirst(fleet.fleet)}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Ship Selection */}
        {selectedFleets.length > 0 && (
          <div className="space-y-3">
            <Label className="text-base font-medium">Ship Selection</Label>
            <div className="grid grid-cols-2 gap-2">
              {getAvailableShips().map((ship) => (
                <div key={ship} className="flex items-center space-x-2">
                  <Checkbox
                    id={`ship-${ship}`}
                    checked={selectedShips.includes(ship)}
                    onCheckedChange={(checked) => 
                      handleShipChange(ship, checked as boolean)
                    }
                  />
                  <Label htmlFor={`ship-${ship}`} className="text-sm">
                    {capitalizeFirst(ship)}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button 
          onClick={handleApplyFilters}
          className="w-full"
          disabled={selectedFleets.length === 0 || selectedShips.length === 0 || (!useAllDates && (!fromDate || !toDate))}
        >
          Apply Filters
        </Button>
      </CardContent>
    </Card>
  );
};

export default BasicFilter;
