import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';  
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Filter, RotateCcw, CheckCircle, ChevronDown, X, Check } from 'lucide-react';
import { format, setMonth, setYear } from 'date-fns';
import { useFilter } from '../contexts/FilterContext';
import { cn } from '@/lib/utils';
import { BasicFilterState } from '../utils/filterUtils';

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
}) => {  const { 
    filterState, 
    setFilterState, 
    resetFilters, 
    availableFleets, 
    availableShips, 
    availableSailingNumbers,
    loadSailingNumbers,
    isLoading,
    isSailingNumbersLoading
  } = useFilter();
  // Add safety checks and default values
  const safeFilterState = {
    fleets: Array.isArray(filterState?.fleets) ? filterState.fleets : [],
    ships: Array.isArray(filterState?.ships) ? filterState.ships : [],
    dateRange: filterState?.dateRange || { startDate: '', endDate: '' },
    sailingNumbers: Array.isArray(filterState?.sailingNumbers) ? filterState.sailingNumbers : []
  };

  const safeAvailableFleets = Array.isArray(availableFleets) ? availableFleets : [];
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();  const [selectedSailingNumbers, setSelectedSailingNumbers] = useState<string[]>([]);
  const [useAllDates, setUseAllDates] = useState(false); // Default to specific date range

  // Function to check if any filters are currently applied
  const areFiltersApplied = () => {
    return (
      safeFilterState.fleets.length > 0 ||
      safeFilterState.ships.length > 0 ||
      (safeFilterState.dateRange.startDate && safeFilterState.dateRange.endDate) ||
      safeFilterState.sailingNumbers.length > 0
    );
  };
  // Function to check if there are pending changes that need to be applied
  const hasPendingChanges = () => {
    const currentStartDate = startDate ? format(startDate, 'yyyy-MM-dd') : '';
    const currentEndDate = endDate ? format(endDate, 'yyyy-MM-dd') : '';
    
    // For useAllDates, check if it differs from the current state
    const currentUseAllDates = useAllDates;
    const persistedUseAllDates = safeFilterState.useAllDates ?? false;
    
    return (
      // Check if dates have changed (only when not using all dates)
      (!currentUseAllDates && (
        (currentStartDate !== (safeFilterState.dateRange.startDate || '')) ||
        (currentEndDate !== (safeFilterState.dateRange.endDate || ''))
      )) ||
      // Check if sailing numbers have changed
      JSON.stringify(selectedSailingNumbers.sort()) !== JSON.stringify((safeFilterState.sailingNumbers || []).sort()) ||
      // Check if useAllDates changed
      currentUseAllDates !== persistedUseAllDates
    );
  };
  const handleFleetChange = (fleetName: string, checked: boolean) => {
    const newFleets = checked 
      ? [...safeFilterState.fleets, fleetName]
      : safeFilterState.fleets.filter(f => f !== fleetName);
    
    setFilterState({ 
      fleets: newFleets,
      ships: [] // Reset ships when fleets change
    });
  };

  const handleShipChange = (shipName: string, checked: boolean) => {
    const newShips = checked 
      ? [...safeFilterState.ships, shipName]
      : safeFilterState.ships.filter(s => s !== shipName);
    
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
    // Prepare standardized filter data for the context update
    const contextUpdate = {
      fleets: safeFilterState.fleets,
      ships: safeFilterState.ships,
      dateRange: {
        startDate: useAllDates ? '' : (startDate ? format(startDate, 'yyyy-MM-dd') : ''),
        endDate: useAllDates ? '' : (endDate ? format(endDate, 'yyyy-MM-dd') : '')
      },
      sailingNumbers: selectedSailingNumbers.length > 0 && !selectedSailingNumbers.includes('-1') 
        ? selectedSailingNumbers 
        : [],
      useAllDates: useAllDates
    };
    
    // Update the filter context state
    setFilterState(contextUpdate);
    
    // Prepare standardized filter data for the callback
    const filterData: BasicFilterState = {
      fleets: safeFilterState.fleets,
      ships: safeFilterState.ships,
      dateRange: {
        startDate: useAllDates ? '' : (startDate ? format(startDate, 'yyyy-MM-dd') : ''),
        endDate: useAllDates ? '' : (endDate ? format(endDate, 'yyyy-MM-dd') : '')
      },
      sailingNumbers: selectedSailingNumbers.length > 0 && !selectedSailingNumbers.includes('-1') 
        ? selectedSailingNumbers 
        : [],
      useAllDates: useAllDates
    };
    
    console.log('BasicFilter sending standardized filter data:', filterData);
    
    // Call the parent component's filter change handler
    onFilterChange?.(filterData);
    onApplyFilters?.();
  };const handleResetFilters = () => {
    resetFilters();
    
    // Reset to default date range (last 30 days) instead of all dates
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultEndDate.getDate() - 30);
      setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setSelectedSailingNumbers([]);
    setUseAllDates(false); // Reset to specific date range, not "All Dates"
  };
  // Load sailing numbers when date range or ships change
  useEffect(() => {
    const loadSailingNumbersForFilter = async () => {
      // Only load if we have ships selected
      if (safeFilterState.ships.length === 0) {
        return;
      }      try {
        // Extract just ship names (remove fleet prefix)
        const shipNamesOnly = safeFilterState.ships.map(ship => ship.split(':')[1]);
        
        if (!useAllDates && startDate && endDate) {
          const startDateStr = format(startDate, 'yyyy-MM-dd');
          const endDateStr = format(endDate, 'yyyy-MM-dd');
          console.log('Loading sailing numbers for specific dates:', { startDateStr, endDateStr, ships: shipNamesOnly });
          await loadSailingNumbers(shipNamesOnly, startDateStr, endDateStr);
        } else if (useAllDates) {
          // For "All Dates", send "-1" as date parameters
          console.log('Loading sailing numbers for all dates:', { ships: shipNamesOnly });
          await loadSailingNumbers(shipNamesOnly, '-1', '-1');
        }
      } catch (error) {
        console.error('Error loading sailing numbers in BasicFilter:', error);
      }
    };

    // Add a small delay to prevent rapid successive calls
    const timeoutId = setTimeout(loadSailingNumbersForFilter, 300);
    return () => clearTimeout(timeoutId);
  }, [startDate, endDate, useAllDates, JSON.stringify(safeFilterState.ships)]); // Use JSON.stringify to properly compare arrays
  // Initialize component state from filter context (persist all filters across pages including sailing numbers)
  useEffect(() => {
    // Load persisted filters including sailing numbers
    if (filterState.dateRange?.startDate) {
      setStartDate(new Date(filterState.dateRange.startDate));
    } else {
      // Set default date range to last 30 days if no persisted date
      const defaultEndDate = new Date();
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultEndDate.getDate() - 30);
      setStartDate(defaultStartDate);
      setEndDate(defaultEndDate);
    }
    
    if (filterState.dateRange?.endDate) {
      setEndDate(new Date(filterState.dateRange.endDate));
    }
    
    setUseAllDates(filterState.useAllDates ?? false);
    
    // Include sailing numbers in persistence now
    if (filterState.sailingNumbers && filterState.sailingNumbers.length > 0) {
      setSelectedSailingNumbers(filterState.sailingNumbers);
    }
  }, []); // Only run on mount

  if (isLoading) {
    return (
      <Card className={compact ? "p-4" : ""}>
        <CardContent>
          <div className="text-center py-4">Loading filters...</div>
        </CardContent>
      </Card>
    );
  }  return (
    <Card className={cn("w-full apollo-shadow bg-white/95 backdrop-blur-sm border-white/20", compact ? "border-0 shadow-none bg-gray-50" : "", className)}>
      {showTitle && (
        <CardHeader className="pb-4">          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="apollo-gradient-primary p-2 rounded-lg">
              <Filter className="h-6 w-6 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span>Apollo Filters</span>
              {areFiltersApplied() && (
                <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Applied
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn("space-y-6", compact ? "p-4" : "p-6")}>
        {/* Fleet Selection */}
        <div>
          <Label className="text-sm font-semibold text-gray-700">Fleet Selection</Label>
          <div className="mt-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between text-left font-normal"
                >                  <span>
                    {safeFilterState.fleets.length === 0 
                      ? "Select fleets..." 
                      : `${safeFilterState.fleets.length} fleet(s) selected`}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>              <PopoverContent className="w-full p-0" align="start">
                <div className="max-h-60 overflow-y-auto">
                  <div className="p-2 border-b">
                    <input
                      type="text"
                      placeholder="Search fleets..."
                      className="w-full p-2 text-sm border rounded"
                      onChange={(e) => {
                        // For now, we'll implement basic filtering
                        // In a full implementation, you'd filter the results
                      }}
                    />
                  </div>
                  <div className="p-2 space-y-1">
                    <div
                      className="flex items-center p-2 hover:bg-gray-100 cursor-pointer rounded text-sm"
                      onClick={() => {
                        // Select All / Deselect All
                        if (safeAvailableFleets.length > 0 && safeFilterState.fleets.length === safeAvailableFleets.length) {
                          setFilterState({ fleets: [], ships: [] });
                        } else if (safeAvailableFleets.length > 0) {
                          setFilterState({ 
                            fleets: safeAvailableFleets.map(f => f.fleet),
                            ships: []
                          });
                        }
                      }}
                    >
                      <Check 
                        className={cn(
                          "mr-2 h-4 w-4",
                          safeAvailableFleets.length > 0 && safeFilterState.fleets.length === safeAvailableFleets.length ? "opacity-100" : "opacity-0"
                        )} 
                      />
                      Select All Fleets
                    </div>
                    {safeAvailableFleets.map((fleet) => (
                      <div
                        key={fleet.fleet}
                        className="flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer rounded text-sm"
                        onClick={() => handleFleetChange(fleet.fleet, !safeFilterState.fleets.includes(fleet.fleet))}
                      >
                        <div className="flex items-center">
                          <Check 
                            className={cn(
                              "mr-2 h-4 w-4",
                              safeFilterState.fleets.includes(fleet.fleet) ? "opacity-100" : "opacity-0"
                            )} 
                          />
                          <span className="capitalize">{fleet.fleet}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {Array.isArray(fleet.ships) ? fleet.ships.length : 0} ships
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
              {/* Selected Fleets Display */}
            {safeFilterState.fleets.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {safeFilterState.fleets.map((fleet) => (
                  <Badge key={fleet} variant="default" className="text-xs">
                    {fleet}
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => handleFleetChange(fleet, false)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>        {/* Ship Selection */}
        {safeFilterState.fleets.length > 0 && (
          <div>
            <Label className="text-sm font-medium">Ship Selection</Label>
            <div className="mt-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between text-left font-normal"
                  >
                    <span>
                      {safeFilterState.ships.length === 0 
                        ? "Select ships..." 
                        : `${safeFilterState.ships.length} ship(s) selected`}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>                <PopoverContent className="w-full p-0" align="start">
                  <div className="max-h-60 overflow-y-auto">
                    <div className="p-2 border-b">
                      <input
                        type="text"
                        placeholder="Search ships..."
                        className="w-full p-2 text-sm border rounded"
                        onChange={(e) => {
                          // For now, we'll implement basic filtering
                          // In a full implementation, you'd filter the results
                        }}
                      />
                    </div>
                    <div className="p-2 space-y-1">
                      <div
                        className="flex items-center p-2 hover:bg-gray-100 cursor-pointer rounded text-sm"
                        onClick={() => {
                          // Select All / Deselect All Ships
                          const allAvailableShips = safeFilterState.fleets.flatMap(fleetName => {
                            const fleet = safeAvailableFleets.find(f => f.fleet === fleetName);
                            return fleet && Array.isArray(fleet.ships) ? fleet.ships.map(ship => `${fleetName}:${ship}`) : [];
                          });
                          
                          if (safeFilterState.ships.length === allAvailableShips.length) {
                            setFilterState({ ships: [] });
                          } else {
                            setFilterState({ ships: allAvailableShips });
                          }
                        }}
                      >
                        <Check 
                          className={cn(
                            "mr-2 h-4 w-4",
                            safeFilterState.ships.length === safeFilterState.fleets.flatMap(fleetName => {
                              const fleet = safeAvailableFleets.find(f => f.fleet === fleetName);
                              return fleet && Array.isArray(fleet.ships) ? fleet.ships.map(ship => `${fleetName}:${ship}`) : [];
                            }).length ? "opacity-100" : "opacity-0"
                          )} 
                        />
                        Select All Ships
                      </div>
                      {safeFilterState.fleets.map((fleetName) => {
                        const fleet = safeAvailableFleets.find(f => f.fleet === fleetName);
                        if (!fleet || !Array.isArray(fleet.ships)) return null;
                        
                        return fleet.ships.map((ship) => (
                          <div
                            key={`${fleetName}:${ship}`}
                            className="flex items-center p-2 hover:bg-gray-100 cursor-pointer rounded text-sm"
                            onClick={() => handleShipChange(`${fleetName}:${ship}`, !safeFilterState.ships.includes(`${fleetName}:${ship}`))}
                          >
                            <Check 
                              className={cn(
                                "mr-2 h-4 w-4",
                                safeFilterState.ships.includes(`${fleetName}:${ship}`) ? "opacity-100" : "opacity-0"
                              )} 
                            />
                            <div className="flex flex-col">
                              <span className="capitalize">{ship}</span>
                              <span className="text-xs text-gray-500 capitalize">{fleetName} Fleet</span>
                            </div>
                          </div>
                        ));
                      }).filter(Boolean)}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
                {/* Selected Ships Display */}
              {safeFilterState.ships.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {safeFilterState.ships.map((ship) => (
                    <Badge key={ship} variant="default" className="text-xs">
                      {ship.split(':')[1]}
                      <X 
                        className="h-3 w-3 ml-1 cursor-pointer" 
                        onClick={() => handleShipChange(ship, false)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>        )}

        {/* Date Range Selection */}
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
                  <div className="p-3 border-b">
                    <div className="flex items-center gap-2 mb-2">
                      <Select 
                        value={(startDate || new Date()).getMonth().toString()} 
                        onValueChange={(value) => {
                          const newDate = setMonth(startDate || new Date(), parseInt(value));
                          setStartDate(newDate);
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => (
                            <SelectItem key={index} value={index.toString()}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select 
                        value={(startDate || new Date()).getFullYear().toString()} 
                        onValueChange={(value) => {
                          const newDate = setYear(startDate || new Date(), parseInt(value));
                          setStartDate(newDate);
                        }}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStartDate(new Date())}
                        className="text-xs"
                      >
                        Today
                      </Button>
                    </div>
                  </div>
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    month={startDate}
                    onMonthChange={(month) => setStartDate(month)}
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
                  <div className="p-3 border-b">
                    <div className="flex items-center gap-2 mb-2">
                      <Select 
                        value={(endDate || new Date()).getMonth().toString()} 
                        onValueChange={(value) => {
                          const newDate = setMonth(endDate || new Date(), parseInt(value));
                          setEndDate(newDate);
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => (
                            <SelectItem key={index} value={index.toString()}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select 
                        value={(endDate || new Date()).getFullYear().toString()} 
                        onValueChange={(value) => {
                          const newDate = setYear(endDate || new Date(), parseInt(value));
                          setEndDate(newDate);
                        }}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEndDate(new Date())}
                        className="text-xs"
                      >
                        Today
                      </Button>
                    </div>
                  </div>
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    month={endDate}
                    onMonthChange={(month) => setEndDate(month)}
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
        </div>        {/* Sailing Number Selection - Always Visible */}
        <div>
          <Label className="text-sm font-semibold text-gray-700">Sailing Numbers</Label>
          <div className="mt-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal border-gray-200 hover:border-gray-300"
                  disabled={isSailingNumbersLoading}
                >
                  {isSailingNumbersLoading ? (
                    "Loading sailing numbers..."
                  ) : selectedSailingNumbers.length === 0 ? (
                    "Select Sailing Numbers (All by default)" 
                  ) : (
                    `${selectedSailingNumbers.length} sailing(s) selected`
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start" side="bottom" sideOffset={5}>
                <div className="p-4 space-y-3 max-h-60 overflow-y-auto apollo-scrollbar">
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
                    <Label htmlFor="all-sailings" className="text-sm font-semibold">
                      All Sailings
                    </Label>
                  </div>
                  {isSailingNumbersLoading ? (
                    <div className="text-center py-4 text-sm text-gray-500">
                      Loading sailing numbers...
                    </div>
                  ) : availableSailingNumbers.length === 0 ? (
                    <div className="text-center py-4 text-sm text-gray-500">
                      No sailing numbers available for selected criteria
                    </div>
                  ) : (
                    availableSailingNumbers.map((sailing) => (
                      <div key={sailing} className="flex items-center space-x-2">
                        <Checkbox
                          id={`sailing-${sailing}`}
                          checked={selectedSailingNumbers.includes(sailing)}
                          onCheckedChange={(checked) => {                            if (checked) {
                              setSelectedSailingNumbers(prev => [...prev, sailing]);
                            } else {
                              setSelectedSailingNumbers(prev => prev.filter(s => s !== sailing));
                            }
                          }}
                        />
                        <Label htmlFor={`sailing-${sailing}`} className="text-sm font-medium">
                          {sailing}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>{/* Action Buttons */}        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          {/* Debug info for button state */}
          {process.env.NODE_ENV === 'development' && (
            <div className="p-2 bg-gray-100 rounded text-xs">
              <p>areFiltersApplied: {areFiltersApplied().toString()}</p>
              <p>hasPendingChanges: {hasPendingChanges().toString()}</p>
              <p>Button disabled: {(areFiltersApplied() && !hasPendingChanges()).toString()}</p>
            </div>
          )}
          <Button 
            onClick={handleApplyFilters} 
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
            disabled={areFiltersApplied() && !hasPendingChanges()}
          >
            {areFiltersApplied() && !hasPendingChanges() ? (
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
        </div>        {/* Current Filter Summary */}        {(safeFilterState.fleets.length > 0 || safeFilterState.ships.length > 0 || 
          safeFilterState.dateRange.startDate || safeFilterState.dateRange.endDate || 
          (selectedSailingNumbers.length > 0 && !selectedSailingNumbers.includes('-1')) ||
          areFiltersApplied() || useAllDates) && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {areFiltersApplied() && <CheckCircle className="h-4 w-4 text-green-600" />}
              <div className="text-sm font-medium text-blue-800">
                {areFiltersApplied() ? 'Active Filters:' : 'Current Filters:'}
              </div>
            </div>
            <div className="text-xs text-blue-600 space-y-1">
              {safeFilterState.fleets.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="font-medium">Fleets:</span>
                  {safeFilterState.fleets.map(fleet => (
                    <span key={fleet} className="bg-blue-200 px-2 py-1 rounded text-xs capitalize">
                      {fleet}
                    </span>
                  ))}
                </div>
              )}
              {safeFilterState.ships.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="font-medium">Ships:</span>
                  {safeFilterState.ships.map(ship => (
                    <span key={ship} className="bg-blue-200 px-2 py-1 rounded text-xs capitalize">
                      {ship.split(':')[1]}
                    </span>
                  ))}
                </div>
              )}              {/* Date Range Display */}
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
              {/* Sailing Numbers Display */}
              {selectedSailingNumbers.length > 0 && !selectedSailingNumbers.includes('-1') && (
                <div className="flex flex-wrap gap-1">
                  <span className="font-medium">Sailing Numbers:</span>
                  {selectedSailingNumbers.map(sailing => (
                    <span key={sailing} className="bg-purple-200 px-2 py-1 rounded text-xs">
                      {sailing}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BasicFilter;
