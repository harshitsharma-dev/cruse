
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Removed Command components due to iteration issues with undefined data
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Search as SearchIcon, Download, Loader2, MessageSquare, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiService } from '../services/api';
import BasicFilter from '../components/BasicFilter';
import { useQuery } from '@tanstack/react-query';

const Search = () => {
  const [query, setQuery] = useState('');
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [selectedMealTimes, setSelectedMealTimes] = useState<string[]>([]);
  const [searchType, setSearchType] = useState('semantic');
  const [cutOff, setCutOff] = useState([7]);
  const [numResults, setNumResults] = useState(50);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);const [filters, setFilters] = useState<any>({
    fromDate: '',
    toDate: '',
    fleets: [],
    ships: [],
    useAllDates: true // Default to "All Dates" mode
  });

  // Fetch available sheets from API
  const { data: sheetsData, isLoading: sheetsLoading, error: sheetsError } = useQuery({
    queryKey: ['sheets'],
    queryFn: () => apiService.getSheets(),
  });

  // Available meal times as per specifications
  const mealTimes = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Other'];
  const handleSheetChange = (sheet: string, checked: boolean) => {
    setSelectedSheets(prev => 
      checked ? [...prev, sheet] : prev.filter(s => s !== sheet)
    );
  };

  const handleMealTimeChange = (mealTime: string, checked: boolean) => {
    setSelectedMealTimes(prev => 
      checked ? [...prev, mealTime] : prev.filter(m => m !== mealTime)
    );
  };
  const handleFilterChange = (newFilters: any) => {
    console.log('=== FILTER CHANGE IN SEARCH ===');
    console.log('New filters received:', newFilters);
    console.log('Previous filters:', filters);
    setFilters(newFilters);
    console.log('Filters updated in Search component');
  };const handleSearch = async () => {
    console.log('=== SEARCH DEBUG START ===');
    console.log('Query:', query);
    console.log('Query trimmed:', query.trim());
    console.log('Current filters object:', filters);
    console.log('filters.useAllDates:', filters.useAllDates);
    console.log('filters.fromDate:', filters.fromDate);
    console.log('filters.toDate:', filters.toDate);
    console.log('Selected sheets:', selectedSheets);
    console.log('Selected meal times:', selectedMealTimes);
    console.log('Search type:', searchType);
    
    if (!query.trim()) {
      console.log('Search aborted: No query provided');
      alert('Please enter a search query');
      return;
    }

    setLoading(true);
    try {
      const searchData = {
        query,
        // Updated to match new BasicFilter format
        fleets: filters.fleets || [],
        ships: filters.ships ? filters.ships.map((ship: string) => ship.split(':')[1] || ship) : [], // Remove fleet prefix
        start_date: filters.useAllDates ? null : (filters.fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
        end_date: filters.useAllDates ? null : (filters.toDate || new Date().toISOString().split('T')[0]),
        sailing_numbers: filters.sailingNumbers || [],
        sheet_names: selectedSheets.length > 0 ? selectedSheets : sheetsData?.data || [],
        meal_time: selectedMealTimes.length > 0 ? selectedMealTimes : undefined,
        semanticSearch: searchType === 'semantic',
        similarity_score_range: searchType === 'semantic' ? [cutOff[0] / 10, 1.0] : [0.0, 1.0],
        num_results: numResults
      };

      console.log('Final search payload:', searchData);
      console.log('Sending search request to API...');
      const response = await apiService.semanticSearch(searchData);
      console.log('Search response received:', response);
      console.log('Results count:', response.results?.length || 0);
      setResults(response.results || []);
    } catch (error) {
      console.error('Search error details:', error);
      alert('Search failed. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
      console.log('=== SEARCH DEBUG END ===');
    }
  };
  const exportResults = () => {
    if (results.length === 0) {
      alert('No results to export');
      return;
    }

    // Simple CSV export with correct field names
    const csvContent = results.map(result => {
      // Extract show/activity name dynamically
      const showKey = Object.keys(result).find(
        key => !['Comment', 'Fleet', 'Distance Score', 'Id', 'status'].includes(key)
      );
      const showName = showKey ? result[showKey] : '';
      
      return `"${result.Comment?.replace(/"/g, '""') || ''}","${result.Fleet || ''}","${showName?.replace(/"/g, '""') || ''}","${result['Distance Score'] || ''}","${result.Id || ''}"`;
    }).join('\n');
    
    const blob = new Blob([`Comment,Fleet,Show/Activity,Distance Score,ID\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'search-results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (sheetsError) {
    console.error('Error loading sheets:', sheetsError);
  }
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Search</h1>          <p className="text-gray-600 mt-2">Search through guest comments and feedback</p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BasicFilter 
          onFilterChange={handleFilterChange}
          showTitle={true}
          compact={false}
        />

        {/* Search Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SearchIcon className="h-5 w-5" />
              Search Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search Query */}
            <div>
              <Label htmlFor="query">Search Query</Label>
              <Input
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your search query..."
                className="mt-2"
              />
            </div>

            {/* Search Type */}
            <div>
              <Label className="text-base font-medium">Search Type</Label>
              <RadioGroup value={searchType} onValueChange={setSearchType} className="flex space-x-4 mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="semantic" id="semantic" />
                  <Label htmlFor="semantic">Semantic AI</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="keyword" id="keyword" />
                  <Label htmlFor="keyword">Keyword</Label>
                </div>
              </RadioGroup>
            </div>            {/* Sheet Selection */}
            <div>
              <Label className="text-base font-medium">Sheet Names</Label>
              {sheetsLoading ? (
                <div className="text-sm text-gray-500 mt-2">Loading sheets...</div>
              ) : sheetsError ? (
                <div className="text-sm text-red-500 mt-2">Error loading sheets</div>
              ) : (
                <div className="mt-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between text-left font-normal"
                      >
                        <span>
                          {selectedSheets.length === 0 
                            ? "All sheets (default)" 
                            : `${selectedSheets.length} sheet(s) selected`}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
                        {/* Select All Option */}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="select-all-sheets"
                            checked={Array.isArray(sheetsData?.data) && selectedSheets.length === sheetsData.data.length}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedSheets(Array.isArray(sheetsData?.data) ? sheetsData.data : []);
                              } else {
                                setSelectedSheets([]);
                              }
                            }}
                          />
                          <Label htmlFor="select-all-sheets" className="text-sm font-medium cursor-pointer">
                            Select All Sheets
                          </Label>
                        </div>
                        
                        {/* Individual Sheet Options */}
                        {Array.isArray(sheetsData?.data) ? sheetsData.data.map((sheet: string) => (
                          <div key={sheet} className="flex items-center space-x-2">
                            <Checkbox
                              id={`sheet-${sheet}`}
                              checked={selectedSheets.includes(sheet)}
                              onCheckedChange={(checked) => handleSheetChange(sheet, !!checked)}
                            />
                            <Label htmlFor={`sheet-${sheet}`} className="text-sm cursor-pointer">
                              {sheet}
                            </Label>
                          </div>
                        )) : (
                          <div className="text-sm text-gray-500">No sheets available</div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  {/* Selected Sheets Display */}
                  {selectedSheets.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedSheets.map((sheet) => (
                        <Badge key={sheet} variant="default" className="text-xs">
                          {sheet}
                          <X 
                            className="h-3 w-3 ml-1 cursor-pointer" 
                            onClick={() => handleSheetChange(sheet, false)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div><div className="grid grid-cols-1 md:grid-cols-2 gap-4">              {/* Meal Time */}
              <div>
                <Label className="text-base font-medium">Meal Time</Label>
                <div className="mt-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between text-left font-normal"
                      >
                        <span>
                          {selectedMealTimes.length === 0 
                            ? "All meal times (default)" 
                            : `${selectedMealTimes.length} meal time(s) selected`}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
                        {/* Select All Option */}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="select-all-meals"
                            checked={selectedMealTimes.length === mealTimes.filter(m => m !== 'All').length}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedMealTimes(mealTimes.filter(m => m !== 'All'));
                              } else {
                                setSelectedMealTimes([]);
                              }
                            }}
                          />
                          <Label htmlFor="select-all-meals" className="text-sm font-medium cursor-pointer">
                            Select All Meal Times
                          </Label>
                        </div>
                        
                        {/* Individual Meal Time Options */}
                        {mealTimes.filter(time => time !== 'All').map((time) => (
                          <div key={time} className="flex items-center space-x-2">
                            <Checkbox
                              id={`meal-${time}`}
                              checked={selectedMealTimes.includes(time)}
                              onCheckedChange={(checked) => handleMealTimeChange(time, !!checked)}
                            />
                            <Label htmlFor={`meal-${time}`} className="text-sm cursor-pointer">
                              {time}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  {/* Selected Meal Times Display */}
                  {selectedMealTimes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedMealTimes.map((time) => (
                        <Badge key={time} variant="default" className="text-xs">
                          {time}
                          <X 
                            className="h-3 w-3 ml-1 cursor-pointer" 
                            onClick={() => handleMealTimeChange(time, false)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Number of Results */}
              <div>
                <Label htmlFor="numResults">Number of Results</Label>
                <Select value={numResults.toString()} onValueChange={(value) => setNumResults(parseInt(value))}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cut-off Slider (only for semantic search) */}
            {searchType === 'semantic' && (
              <div>
                <Label className="text-base font-medium">
                  Cut-off Score: {cutOff[0]}
                </Label>
                <Slider
                  value={cutOff}
                  onValueChange={setCutOff}
                  max={10}
                  min={1}
                  step={0.1}
                  className="mt-2"
                />
              </div>            )}

            {/* Debug info for button state */}
            {process.env.NODE_ENV === 'development' && (
              <div className="p-2 bg-gray-100 rounded text-xs">
                <p>Loading: {loading.toString()}</p>
                <p>Query: {query}</p>
                <p>Query trimmed: {query.trim()}</p>
                <p>UseAllDates: {filters?.useAllDates?.toString()}</p>
                <p>FromDate: {filters?.fromDate || 'undefined'}</p>
                <p>ToDate: {filters?.toDate || 'undefined'}</p>
                <p>Button disabled: {(loading || !query.trim() || (!filters?.useAllDates && (!filters?.fromDate || !filters?.toDate))).toString()}</p>
              </div>
            )}

            <Button 
              onClick={handleSearch} 
              className="w-full bg-blue-600 hover:bg-blue-700" 
              disabled={loading || !query.trim()}
            >
              <SearchIcon className="h-4 w-4 mr-2" />
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </CardContent>
        </Card>
      </div>      {/* Results Section */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Search Results ({results.length})</CardTitle>
              <Button onClick={exportResults} variant="outline" size="sm" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent><div className="space-y-4">
              {results.map((result, index) => {
                console.log('Rendering search result:', result);
                
                // Extract show/activity name dynamically (field that's not a standard field)
                const showKey = Object.keys(result).find(
                  key => !['Comment', 'Fleet', 'Distance Score', 'Id', 'status'].includes(key)
                );
                const showName = showKey ? result[showKey] : 'N/A';
                
                return (
                  <div key={result.Id || index} className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-2 flex-wrap">
                        {result.Fleet && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Fleet: {result.Fleet}
                          </span>
                        )}
                        {showName && showName !== 'N/A' && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Activity: {showName}
                          </span>
                        )}
                        {result['Distance Score'] && (
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            Score: {result['Distance Score'].toFixed(3)}
                          </span>
                        )}
                      </div>
                      {result.Id && (
                        <span className="text-xs text-gray-500">
                          ID: {result.Id.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                    
                    {showKey && (
                      <div className="mb-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {showKey}: {showName}
                        </span>
                      </div>
                    )}
                    
                    <p className="text-sm text-gray-700 leading-relaxed mb-2">
                      <span className="font-medium">Comment:</span> {result.Comment || 'No comment available'}
                    </p>
                    
                    {/* Debug info in development */}
                    {process.env.NODE_ENV === 'development' && (
                      <details className="text-xs text-gray-500 mt-2">
                        <summary>Debug Info</summary>
                        <pre className="mt-1 bg-gray-100 p-2 rounded text-xs overflow-auto">
                          {JSON.stringify(result, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Searching...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {results.length === 0 && !loading && query && filters.fleets && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <SearchIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No results found</p>
              <p className="text-sm">Try adjusting your search query or filters</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Search;
