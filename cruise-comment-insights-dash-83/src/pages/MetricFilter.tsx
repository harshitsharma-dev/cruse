import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Filter, Loader2, Download } from 'lucide-react';
import BasicFilter from '@/components/BasicFilter';
import { FormattedText } from '@/components/FormattedText';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/api';

const MetricFilter = () => {  const [selectedMetric, setSelectedMetric] = useState<string>(''); // Changed to single metric
  const [ratingRange, setRatingRange] = useState<number[]>([6, 10]);
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);const [filters, setFilters] = useState<any>({
    fromDate: '',
    toDate: '',
    fleets: [],
    ships: [],
    useAllDates: true // Default to "All Dates" mode
  });
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Fetch available metrics from API
  const { data: metricsData, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => apiService.getMetrics(),
  });
  const handleFilterChange = (filterData: any) => {
    console.log('Filter data received:', filterData);
    setFilters(filterData);
  };

  const toggleRowExpansion = (index: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };
  const handleSearch = async () => {
    if (!selectedMetric) {
      alert('Please select a metric');
      return;
    }    setIsLoading(true);
    try {      const searchData = {
        filter_by: (filters.useAllDates && filters.sailingNumbers && filters.sailingNumbers.length > 0) ? 'sailing' : 'date',
        filters: {
          // Include dates if not using "All Dates" mode OR if using All Dates but no sailing numbers are selected
          ...((filters.useAllDates && filters.sailingNumbers && filters.sailingNumbers.length > 0) ? {} : {
            fromDate: filters.fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            toDate: filters.toDate || new Date().toISOString().split('T')[0],
          }),
          fleets: filters.fleets && filters.fleets.length > 0 ? filters.fleets : undefined,
          ships: filters.ships && filters.ships.length > 0 ? filters.ships : undefined,
          sailing_numbers: filters.sailingNumbers && filters.sailingNumbers.length > 0 ? filters.sailingNumbers : undefined
        },
        metric: selectedMetric, // Changed back to single metric
        filterBelow: ratingRange[1], // Use upper bound of rating range as filter
        compareToAverage: true
      };console.log('Sending metric filter request:', searchData);
      const response = await apiService.getMetricRating(searchData);
      console.log('Metric filter response:', response);
      
      // Transform and sanitize the API response to match expected structure
      const transformedResults: any[] = [];
      
      (response.results || []).forEach(result => {
        // Skip results with errors or no data
        if (result.error || result.filteredCount === 0 || !result.filteredReviews?.length) {
          return;
        }
        
        // Create entries for each filtered review
        result.filteredReviews.forEach((comment: string, index: number) => {
          const rating = result.filteredMetric?.[index];
          if (rating !== undefined && rating >= ratingRange[0] && rating <= ratingRange[1]) {
            transformedResults.push({
              ship: result.ship,
              sailingNumber: result.sailingNumber,
              metric: result.metric,
              averageRating: result.averageRating || 0,
              rating: rating,
              comment: comment,
              comparisonToOverall: result.comparisonToOverall || 0,
              ratingCount: result.ratingCount || 0,
              filteredCount: result.filteredCount || 0
            });
          }
        });
      });
      
      setResults(transformedResults);} catch (error) {
      console.error('Metric filter error:', error);
      let errorMessage = 'Failed to fetch metric data. Please try again.';
      
      // Handle JSON parsing errors specifically
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        errorMessage = 'Server returned invalid data. This may be due to missing metric values.';
        console.error('JSON parsing error - likely NaN values in response');
      }
      
      alert(errorMessage);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };
  const exportResults = () => {
    if (results.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Ship', 'Sailing Number', 'Metric', 'Rating', 'Average Rating', 'Comparison to Overall', 'Comment'];
    const csvContent = results.map(row => [
      `"${row.ship || 'N/A'}"`,
      `"${row.sailingNumber || 'N/A'}"`,
      `"${row.metric || 'N/A'}"`,
      `"${row.rating || 'N/A'}"`,
      `"${row.averageRating?.toFixed(2) || 'N/A'}"`,
      `"${row.comparisonToOverall?.toFixed(2) || 'N/A'}"`,
      `"${(row.comment || 'N/A').replace(/"/g, '""')}"`
    ].join(',')).join('\n');
    
    const blob = new Blob([`${headers.join(',')}\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metric-filter-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'bg-green-100 text-green-800';
    if (rating >= 6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Metric Filter</h1>
          <p className="text-gray-600 mt-2">Filter comments by rating metrics and ranges</p>
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
        
        {/* Filter Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Metric Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Rating Range Slider */}
            <div>
              <Label className="text-base font-medium">Rating Range</Label>
              <div className="mt-4 px-2">
                <Slider
                  value={ratingRange}
                  onValueChange={setRatingRange}
                  max={10}
                  min={0}
                  step={0.5}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <span>Lower: {ratingRange[0]}</span>
                  <span>Upper: {ratingRange[1]}</span>
                </div>
              </div>
            </div>            {/* Metric Selection */}
            <div>
              <Label className="text-base font-medium">Rating Metrics</Label>
              {metricsLoading ? (
                <div className="text-sm text-gray-500 mt-2">Loading metrics...</div>
              ) : metricsError ? (
                <div className="text-sm text-red-500 mt-2">Error loading metrics</div>
              ) : (
                <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select a metric to analyze" />
                  </SelectTrigger>
                  <SelectContent>
                    {metricsData?.data?.map((metric: string) => (
                      <SelectItem key={metric} value={metric}>
                        {metric}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Search Button */}
            <Button 
              onClick={handleSearch} 
              disabled={isLoading || !selectedMetric}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Filter className="h-4 w-4 mr-2" />
                  Apply Metric Filter
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results Section */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Filtering metric data...</span>
            </div>
          </CardContent>
        </Card>
      ) : results.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Filtered Results ({results.length} entries)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                      <div>
                        <div className="text-sm font-medium text-gray-500">Ship</div>
                        <div className="text-sm">{result.ship || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Sailing Number</div>
                        <div className="text-sm">{result.sailingNumber || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Rating</div>
                        <Badge className={getRatingColor(result.rating)} variant="secondary">
                          {result.rating?.toFixed(1) || 'N/A'}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Average Rating</div>
                        <div className="text-sm">
                          {result.averageRating?.toFixed(2) || 'N/A'}
                          {result.comparisonToOverall !== undefined && (
                            <span className={`ml-2 text-xs ${result.comparisonToOverall >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ({result.comparisonToOverall > 0 ? '+' : ''}{result.comparisonToOverall.toFixed(2)})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleRowExpansion(index)}
                      className="ml-4"
                    >
                      {expandedRows.has(index) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  <Collapsible open={expandedRows.has(index)}>
                    <CollapsibleContent>                      <div className="border-t pt-3 mt-3">
                        <div className="text-sm font-medium text-gray-500 mb-2">Comment:</div>
                        <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded max-h-32 overflow-y-auto apollo-scrollbar">
                          {result.comment ? (
                            <FormattedText 
                              text={result.comment} 
                              className="text-gray-700"
                            />
                          ) : (
                            <p className="text-gray-500 italic">No comment available</p>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <Filter className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No results yet</p>
              <p className="text-sm">Configure filters and click "Apply Metric Filter" to see results</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MetricFilter;
