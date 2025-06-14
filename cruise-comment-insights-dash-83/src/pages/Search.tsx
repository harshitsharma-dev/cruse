
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search as SearchIcon, Download, Loader2, MessageSquare } from 'lucide-react';
import { apiService } from '../services/api';
import BasicFilter from '../components/BasicFilter';
import { useQuery } from '@tanstack/react-query';

const Search = () => {
  const [query, setQuery] = useState('');
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [mealTime, setMealTime] = useState('All');
  const [searchType, setSearchType] = useState('semantic');
  const [cutOff, setCutOff] = useState([7]);
  const [numResults, setNumResults] = useState(50);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);  const [filters, setFilters] = useState<any>({
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

  const handleFilterChange = (newFilters: any) => {
    console.log('Filter change in Search:', newFilters);
    setFilters(newFilters);
  };  const handleSearch = async () => {
    if (!query.trim()) {
      alert('Please enter a search query');
      return;
    }    setLoading(true);
    try {
      const searchData = {
        query,
        filter_by: filters.useAllDates ? 'all' : 'semantic',
        filters: {
          // Only include dates if not using "All Dates" mode
          ...(filters.useAllDates ? {} : {
            start_date: filters.fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end_date: filters.toDate || new Date().toISOString().split('T')[0],
          }),
          fleets: filters.fleets && filters.fleets.length > 0 ? filters.fleets : undefined,
          ships: filters.ships && filters.ships.length > 0 ? filters.ships : undefined,
          sailing_numbers: filters.sailingNumbers && filters.sailingNumbers.length > 0 ? filters.sailingNumbers : undefined
        },
        sheet_names: selectedSheets.length > 0 ? selectedSheets : sheetsData?.data || [],
        meal_time: mealTime === 'All' ? undefined : mealTime,
        semanticSearch: searchType === 'semantic',
        similarity_score_range: searchType === 'semantic' ? [cutOff[0] / 10, 1.0] : [0.0, 1.0],
        num_results: numResults
      };

      console.log('Sending search request:', searchData);
      const response = await apiService.semanticSearch(searchData);
      console.log('Search response:', response);
      setResults(response.results || []);
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const exportResults = () => {
    if (results.length === 0) {
      alert('No results to export');
      return;
    }

    // Simple CSV export
    const csvContent = results.map(result => 
      `"${result.comment?.replace(/"/g, '""') || ''}","${result.metadata?.fleet || ''}","${result.metadata?.ship || ''}","${result.sheet_name || ''}","${result.metadata?.sailing_number || ''}","${result.meal_time || ''}"`
    ).join('\n');
    
    const blob = new Blob([`Comment,Fleet,Ship,Sheet,Sailing Number,Meal Time\n${csvContent}`], { type: 'text/csv' });
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
          <h1 className="text-3xl font-bold text-gray-900">Search</h1>
          <p className="text-gray-600 mt-2">Search through guest comments and feedback</p>
        </div>
        {results.length > 0 && (
          <Button onClick={exportResults} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Results ({results.length})
          </Button>
        )}
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
            </div>

            {/* Sheet Selection */}
            <div>
              <Label className="text-base font-medium">Sheet Names</Label>
              {sheetsLoading ? (
                <div className="text-sm text-gray-500 mt-2">Loading sheets...</div>
              ) : sheetsError ? (
                <div className="text-sm text-red-500 mt-2">Error loading sheets</div>
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {sheetsData?.data?.map((sheet: string) => (
                    <div key={sheet} className="flex items-center space-x-2">
                      <Checkbox
                        id={`sheet-${sheet}`}
                        checked={selectedSheets.includes(sheet)}
                        onCheckedChange={(checked) => 
                          handleSheetChange(sheet, checked as boolean)
                        }
                      />
                      <Label htmlFor={`sheet-${sheet}`} className="text-sm cursor-pointer">
                        {sheet}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Meal Time */}
              <div>
                <Label htmlFor="mealTime">Meal Time</Label>
                <Select value={mealTime} onValueChange={setMealTime}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mealTimes.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              </div>
            )}            <Button 
              onClick={handleSearch} 
              className="w-full bg-blue-600 hover:bg-blue-700" 
              disabled={loading || !query.trim() || (!filters?.useAllDates && (!filters?.fromDate || !filters?.toDate))}
            >
              <SearchIcon className="h-4 w-4 mr-2" />
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results Section */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results ({results.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2 flex-wrap">
                      {result.metadata?.fleet && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Fleet: {result.metadata.fleet}
                        </span>
                      )}
                      {result.metadata?.ship && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Ship: {result.metadata.ship}
                        </span>
                      )}
                      {result.sheet_name && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                          Sheet: {result.sheet_name}
                        </span>
                      )}
                    </div>
                    {result.metadata?.sailing_number && (
                      <span className="text-xs text-gray-500">
                        Sailing: {result.metadata.sailing_number}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{result.comment}</p>
                  {result.meal_time && (
                    <p className="text-xs text-gray-500 mt-2">
                      Meal Time: {result.meal_time}
                    </p>
                  )}
                </div>
              ))}
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
