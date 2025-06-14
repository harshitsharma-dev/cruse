
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Filter, RotateCcw, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useFilter } from '../contexts/FilterContext';
import { cn } from '@/lib/utils';

interface BasicFilterProps {
  onFilterChange?: (filters: any) => void;
  onApplyFilters?: () => void;
  currentFilters?: any;
  showTitle?: boolean;
  compact?: boolean;
  className?: string;
}

const BasicFilter: React.FC<BasicFilterProps> = ({ 
  onFilterChange,
  onApplyFilters,
  currentFilters,
  showTitle = true,
  compact = false,
  className 
}) => {
  const { 
    filterState, 
    setFilterState, 
    resetFilters, 
    availableFleets, 
    availableShips, 
    isLoading 
  } = useFilter();  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedSailingNumbers, setSelectedSailingNumbers] = useState<string[]>([]);
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [useAllDates, setUseAllDates] = useState(true); // Default to "All Dates"

  const handleFleetChange = (fleetName: string, checked: boolean) => {
    const newFleets = checked 
      ? [...filterState.fleets, fleetName]
      : filterState.fleets.filter(f => f !== fleetName);
    
    setFilterState({ 
      fleets: newFleets,
      ships: [] // Reset ships when fleets change
    });
  };

  const handleShipChange = (shipName: string, checked: boolean) => {
    const newShips = checked 
      ? [...filterState.ships, shipName]
      : filterState.ships.filter(s => s !== shipName);
    
    setFilterState({ ships: newShips });
  };

  const handleDateRangeApply = () => {
    if (startDate && endDate) {
      setFilterState({
        dateRange: {
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd')
        }
      });
    }
  };  const handleApplyFilters = () => {
    handleDateRangeApply();
    
    // Prepare filter data in the format expected by parent components
    const filterData = {
      fleets: filterState.fleets,
      ships: filterState.ships.map(ship => ship.split(':')[1]), // Remove the fleet prefix
      // Only include dates if not using "All Dates"
      fromDate: useAllDates ? null : (startDate ? format(startDate, 'yyyy-MM-dd') : filterState.dateRange.startDate),
      toDate: useAllDates ? null : (endDate ? format(endDate, 'yyyy-MM-dd') : filterState.dateRange.endDate),
      sailingNumbers: selectedSailingNumbers.length > 0 ? selectedSailingNumbers : ['all'],
      filter_by: useAllDates ? 'all' : 'date', // Use 'all' for all dates
      useAllDates: useAllDates
    };
    
    console.log('BasicFilter sending filter data:', filterData);
    console.log('useAllDates state:', useAllDates);
    
    // Show applied feedback
    setFiltersApplied(true);
    setTimeout(() => setFiltersApplied(false), 3000); // Hide after 3 seconds
    
    // Call the parent component's filter change handler
    onFilterChange?.(filterData);
    onApplyFilters?.();
  };  const handleResetFilters = () => {
    resetFilters();
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedSailingNumbers([]);
    setFiltersApplied(false);
    setUseAllDates(true); // Reset to "All Dates"
  };

  if (isLoading) {
    return (
      <Card className={compact ? "p-4" : ""}>
        <CardContent>
          <div className="text-center py-4">Loading filters...</div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className={cn("w-full", compact ? "border-0 shadow-none bg-gray-50" : "", className)}>
      {showTitle && (
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn("space-y-6", compact ? "p-4" : "p-6")}>
        {/* Fleet Selection */}
        <div>
          <Label className="text-sm font-medium">Fleet Selection</Label>
          <div className="mt-2 space-y-2">
            {availableFleets.map((fleet) => (
              <div key={fleet.fleet} className="flex items-center space-x-2">
                <Checkbox
                  id={`fleet-${fleet.fleet}`}
                  checked={filterState.fleets.includes(fleet.fleet)}
                  onCheckedChange={(checked) => 
                    handleFleetChange(fleet.fleet, checked as boolean)
                  }
                />
                <Label 
                  htmlFor={`fleet-${fleet.fleet}`}
                  className="text-sm capitalize cursor-pointer"
                >
                  {fleet.fleet} ({fleet.ships.length} ships)
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Ship Selection */}
        {filterState.fleets.length > 0 && (
          <div>
            <Label className="text-sm font-medium">Ship Selection</Label>
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {filterState.fleets.map((fleetName) => {
                const fleet = availableFleets.find(f => f.fleet === fleetName);
                if (!fleet) return null;
                
                return (
                  <div key={fleetName} className="space-y-1">
                    <div className="text-xs font-medium text-gray-500 capitalize">
                      {fleetName} Fleet:
                    </div>
                    {fleet.ships.map((ship) => (
                      <div key={`${fleetName}:${ship}`} className="flex items-center space-x-2 ml-4">
                        <Checkbox
                          id={`ship-${fleetName}-${ship}`}
                          checked={filterState.ships.includes(`${fleetName}:${ship}`)}
                          onCheckedChange={(checked) => 
                            handleShipChange(`${fleetName}:${ship}`, checked as boolean)
                          }
                        />
                        <Label 
                          htmlFor={`ship-${fleetName}-${ship}`}
                          className="text-sm capitalize cursor-pointer"
                        >
                          {ship}
                        </Label>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}        {/* Date Range Selection */}
        <div>
          <Label className="text-sm font-medium">Sailing Date Range</Label>
          
          {/* All Dates Toggle */}
          <div className="mt-3 flex items-center space-x-2">
            <Checkbox
              id="all-dates"
              checked={useAllDates}
              onCheckedChange={(checked) => {
                setUseAllDates(checked as boolean);
                if (checked) {
                  setStartDate(undefined);
                  setEndDate(undefined);
                }
              }}
            />
            <Label htmlFor="all-dates" className="text-sm font-medium cursor-pointer">
              All Dates (No date restriction)
            </Label>
          </div>
          
          {/* Date Pickers - only show when not using "All Dates" */}
          {!useAllDates && (
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full sm:w-auto justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Start Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={5}>
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full sm:w-auto justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "End Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={5}>
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
          
          {/* Show selected range or "All Dates" indicator */}
          <div className="mt-2 text-xs text-gray-600">
            {useAllDates ? (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                📅 All dates included
              </span>
            ) : (startDate && endDate) ? (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                📅 {format(startDate, "MMM dd")} - {format(endDate, "MMM dd, yyyy")}
              </span>
            ) : (
              <span className="text-gray-500">Please select date range</span>
            )}
          </div>
        </div>

        {/* Sailing Number Selection */}
        {(startDate && endDate) && (
          <div>
            <Label className="text-sm font-medium">Sailing Numbers</Label>
            <div className="mt-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    {selectedSailingNumbers.length === 0 
                      ? "Select Sailing Numbers (All by default)" 
                      : `${selectedSailingNumbers.length} sailing(s) selected`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start" side="bottom" sideOffset={5}>
                  <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="all-sailings"
                        checked={selectedSailingNumbers.length === 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedSailingNumbers([]);
                          }
                        }}
                      />
                      <Label htmlFor="all-sailings" className="text-sm font-medium">
                        All Sailings
                      </Label>
                    </div>
                    {/* Mock sailing numbers - in real implementation, these would be fetched based on date range */}
                    {['SL001', 'SL002', 'SL003', 'SL004', 'SL005', 'SL006', 'SL007', 'SL008'].map((sailing) => (
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
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button 
            onClick={handleApplyFilters} 
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
            disabled={filtersApplied}
          >
            {filtersApplied ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Filters Applied!
              </>
            ) : (
              <>
                <Filter className="h-4 w-4" />
                Apply Filters
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleResetFilters}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>        {/* Current Filter Summary */}
        {(filterState.fleets.length > 0 || filterState.ships.length > 0 || 
          filterState.dateRange.startDate || filterState.dateRange.endDate || filtersApplied || useAllDates) && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {filtersApplied && <CheckCircle className="h-4 w-4 text-green-600" />}
              <div className="text-sm font-medium text-blue-800">
                {filtersApplied ? 'Active Filters:' : 'Current Filters:'}
              </div>
            </div>
            <div className="text-xs text-blue-600 space-y-1">
              {filterState.fleets.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="font-medium">Fleets:</span>
                  {filterState.fleets.map(fleet => (
                    <span key={fleet} className="bg-blue-200 px-2 py-1 rounded text-xs capitalize">
                      {fleet}
                    </span>
                  ))}
                </div>
              )}
              {filterState.ships.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="font-medium">Ships:</span>
                  {filterState.ships.map(ship => (
                    <span key={ship} className="bg-blue-200 px-2 py-1 rounded text-xs capitalize">
                      {ship.split(':')[1]}
                    </span>
                  ))}
                </div>
              )}
              {/* Date Range Display */}
              <div>
                <span className="font-medium">Date Range:</span> {' '}
                {useAllDates ? (
                  <span className="bg-green-200 px-2 py-1 rounded text-xs">
                    All Dates
                  </span>
                ) : (startDate && endDate) ? (
                  <span className="bg-blue-200 px-2 py-1 rounded text-xs">
                    {format(startDate, 'yyyy-MM-dd')} to {format(endDate, 'yyyy-MM-dd')}
                  </span>
                ) : (filterState.dateRange.startDate && filterState.dateRange.endDate) ? (
                  <span className="bg-blue-200 px-2 py-1 rounded text-xs">
                    {filterState.dateRange.startDate} to {filterState.dateRange.endDate}
                  </span>
                ) : (
                  <span className="bg-gray-200 px-2 py-1 rounded text-xs">
                    Not set
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BasicFilter;
