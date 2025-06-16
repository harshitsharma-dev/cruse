
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import BasicFilter from '@/components/BasicFilter';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/api';

const MetricFilter = () => {
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const [filterBelow, setFilterBelow] = useState<number[]>([5]);
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<any>({});

  // Fetch available metrics from API
  const { data: metricsData, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => apiService.getMetrics(),
  });

  const handleFilterChange = (filterData: any) => {
    console.log('Filter data received:', filterData);
    setFilters(filterData);
  };

  const handleSearch = async () => {
    if (!selectedMetric) {
      alert('Please select a metric');
      return;
    }

    if (!filters.fromDate || !filters.toDate) {
      alert('Please select date range from the basic filters');
      return;
    }

    if (!filters.fleets || filters.fleets.length === 0) {
      alert('Please select at least one fleet from the basic filters');
      return;
    }

    if (!filters.ships || filters.ships.length === 0) {
      alert('Please select at least one ship from the basic filters');
      return;
    }    setIsLoading(true);
    try {
      const searchData = {
        filter_by: filters.useAllDates ? 'all' : 'date',
        filters: {
          fromDate: filters.fromDate,     // Will be "-1" for all dates
          toDate: filters.toDate,         // Will be "-1" for all dates
          fleets: filters.fleets || [],
          ships: filters.ships || [],
          sailingNumbers: filters.sailingNumbers || ['-1']
        },
        metric: selectedMetric,
        filterBelow: filterBelow[0],
        compareToAverage: true
      };

      console.log('Sending metric filter request:', searchData);
      const response = await apiService.getMetricRating(searchData);
      console.log('Metric filter response:', response);
      setResults(response.results || []);
    } catch (error) {
      console.error('Error fetching metric data:', error);
      alert('Error fetching metric data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (metricsError) {
    console.error('Error loading metrics:', metricsError);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Metric Filter</h1>
        <p className="text-gray-600 mt-2">Filter and analyze specific metrics across sailings</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <BasicFilter onFilterChange={handleFilterChange} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Select Metric</label>
              {metricsLoading ? (
                <div className="text-sm text-gray-500">Loading metrics...</div>
              ) : metricsError ? (
                <div className="text-sm text-red-500">Error loading metrics</div>
              ) : (
                <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a metric..." />
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

            <div>
              <label className="block text-sm font-medium mb-2">
                Filter Below Rating: {filterBelow[0]}
              </label>
              <Slider
                value={filterBelow}
                onValueChange={setFilterBelow}
                max={10}
                min={1}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>

          <Button 
            onClick={handleSearch} 
            className="w-full"
            disabled={isLoading || !selectedMetric || !filters.fromDate || !filters.toDate || !filters.fleets?.length || !filters.ships?.length}
          >
            {isLoading ? 'Analyzing...' : 'Analyze Metric'}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedMetric} Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  {result.error ? (
                    <div className="text-red-600">
                      <h3 className="font-semibold">{result.ship} - Sailing {result.sailingNumber}</h3>
                      <p>Error: {result.error}</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{result.ship}</h3>
                          <p className="text-gray-600">Sailing: {result.sailingNumber}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {result.averageRating}
                          </div>
                          <p className="text-sm text-gray-600">
                            {result.ratingCount} ratings
                          </p>
                          {result.comparisonToOverall !== undefined && (
                            <p className="text-xs text-gray-500">
                              {result.comparisonToOverall > 0 ? '+' : ''}{result.comparisonToOverall} vs avg
                            </p>
                          )}
                        </div>
                      </div>

                      {result.filteredReviews && result.filteredReviews.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">
                              {result.filteredCount} reviews below {filterBelow[0]}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            {result.filteredReviews.slice(0, 3).map((review: string, idx: number) => (
                              <div key={idx} className="p-3 bg-gray-50 rounded text-sm">
                                {review}
                              </div>
                            ))}
                            {result.filteredReviews.length > 3 && (
                              <p className="text-sm text-gray-600">
                                +{result.filteredReviews.length - 3} more reviews
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading results...</p>
        </div>
      )}

      {results.length === 0 && !isLoading && selectedMetric && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-gray-500">No results found. Try adjusting your filters.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MetricFilter;
