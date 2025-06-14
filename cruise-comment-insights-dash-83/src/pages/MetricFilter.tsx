import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Filter, Loader2, Download } from 'lucide-react';
import BasicFilter from '@/components/BasicFilter';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/api';

const MetricFilter = () => {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [ratingRange, setRatingRange] = useState<number[]>([6, 10]);
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);  const [filters, setFilters] = useState<any>({
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

  const handleMetricChange = (metric: string, checked: boolean) => {
    setSelectedMetrics(prev => 
      checked ? [...prev, metric] : prev.filter(m => m !== metric)
    );
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
    if (selectedMetrics.length === 0) {
      alert('Please select at least one metric');
      return;
    }    setIsLoading(true);
    try {
      const searchData = {
        filter_by: filters.useAllDates ? 'all' : 'date',
        filters: {
          // Only include dates if not using "All Dates" mode
          ...(filters.useAllDates ? {} : {
            fromDate: filters.fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            toDate: filters.toDate || new Date().toISOString().split('T')[0],
          }),
          fleets: filters.fleets && filters.fleets.length > 0 ? filters.fleets : undefined,
          ships: filters.ships && filters.ships.length > 0 ? filters.ships : undefined,
          sailing_numbers: filters.sailingNumbers && filters.sailingNumbers.length > 0 ? filters.sailingNumbers : undefined
        },
        metrics: selectedMetrics, // Send as metrics array for multiple metrics support
        filterBelow: ratingRange[1], // Use upper bound of rating range as filter
        compareToAverage: true
      };

      console.log('Sending metric filter request:', searchData);
      const response = await apiService.getMetricRating(searchData);
      console.log('Metric filter response:', response);
      setResults(response.results || []);
    } catch (error) {
      console.error('Metric filter error:', error);
      alert('Failed to fetch metric data. Please try again.');
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

    const headers = ['Fleet', 'Ship', 'Sailing Number', 'Rating', 'Comment'];
    const csvContent = results.map(row => 
      headers.map(header => `"${row[header] || 'N/A'}"`).join(',')
    ).join('\n');
    
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
            </div>

            {/* Metric Selection */}
            <div>
              <Label className="text-base font-medium">Rating Metrics</Label>
              {metricsLoading ? (
                <div className="text-sm text-gray-500 mt-2">Loading metrics...</div>
              ) : metricsError ? (
                <div className="text-sm text-red-500 mt-2">Error loading metrics</div>
              ) : (
                <div className="grid grid-cols-1 gap-2 mt-3 max-h-60 overflow-y-auto">
                  {metricsData?.data?.map((metric: string) => (
                    <div key={metric} className="flex items-center space-x-2">
                      <Checkbox
                        id={`metric-${metric}`}
                        checked={selectedMetrics.includes(metric)}
                        onCheckedChange={(checked) => 
                          handleMetricChange(metric, checked as boolean)
                        }
                      />
                      <Label htmlFor={`metric-${metric}`} className="text-sm cursor-pointer">
                        {metric}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Search Button */}
            <Button 
              onClick={handleSearch} 
              disabled={isLoading || selectedMetrics.length === 0}
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
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                      <div>
                        <div className="text-sm font-medium text-gray-500">Fleet</div>
                        <div className="text-sm capitalize">{result.fleet || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Ship</div>
                        <div className="text-sm">{result.ship || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Sailing</div>
                        <div className="text-sm">{result.sailing_number || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Rating</div>
                        <Badge className={getRatingColor(result.rating)} variant="secondary">
                          {result.rating?.toFixed(1) || 'N/A'}
                        </Badge>
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
                    <CollapsibleContent>
                      <div className="border-t pt-3 mt-3">
                        <div className="text-sm font-medium text-gray-500 mb-2">Comment:</div>
                        <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                          {result.comment || 'No comment available'}
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
