import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { apiService } from '../services/api';
import { useQuery } from '@tanstack/react-query';
import BasicFilter from '../components/BasicFilter';
import { FormattedText } from '../components/FormattedText';
import { SortControls } from '../components/SortControls';
import { BasicFilterState, createMetricRatingApiData, debugFilters } from '../utils/filterUtils';
import { sortData, toggleSort, SortConfig, METRIC_SORT_OPTIONS } from '../utils/sortingUtils';

const MetricFilter = () => {
  const [selectedMetric, setSelectedMetric] = useState<string>(''); // Changed to single metric
  const [ratingRange, setRatingRange] = useState<number[]>([6, 10]);
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<BasicFilterState>({
    fleets: [],
    ships: [],
    dateRange: { startDate: '', endDate: '' },
    sailingNumbers: [],
    useAllDates: false // Default to specific date range
  });
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // Fetch available metrics from API
  const { data: metricsData, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => apiService.getMetrics(),
  });  const handleFilterChange = (filterData: BasicFilterState) => {
    debugFilters('Filter data received in MetricFilter', filterData);
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
  };  const handleSearch = async () => {
    if (!selectedMetric) {
      alert('Please select a metric');
      return;
    }

    setIsLoading(true);
    try {
      const searchData = createMetricRatingApiData(filters, selectedMetric, {
        filterBelow: ratingRange[1], // Use upper bound of rating range as filter
        compareToAverage: true
      });

      debugFilters('Sending metric filter request', searchData);
      const response = await apiService.getMetricRating(searchData);
      console.log('Metric filter response:', response);
      
      // Use the new backend structure with filteredReviews and filteredComments
      const transformedResults = (response.results || [])
        .filter(result => !result.error && result.filteredCount > 0)
        .map(result => ({
          ship: result.ship,
          sailingNumber: result.sailingNumber,
          metric: result.metric,
          averageRating: result.averageRating || 0,
          comparisonToOverall: result.comparisonToOverall || 0,
          ratingCount: result.ratingCount || 0,
          filteredCount: result.filteredCount || 0,
          filteredReviews: result.filteredReviews || [],
          filteredComments: result.filteredComments || [],
          filteredMetric: result.filteredMetric || []
        }));
      
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
  };  const exportResults = () => {
    if (results.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Ship', 'Sailing Number', 'Metric', 'Average Rating', 'Comparison to Overall', 'Filtered Count', 'Reviews'];
    const csvContent = results.map(row => [
      `"${row.ship || 'N/A'}"`,
      `"${row.sailingNumber || 'N/A'}"`,
      `"${row.metric || 'N/A'}"`,
      `"${row.averageRating?.toFixed(2) || 'N/A'}"`,
      `"${row.comparisonToOverall?.toFixed(2) || 'N/A'}"`,
      `"${row.filteredCount || 'N/A'}"`,
      `"${(row.filteredReviews?.join('; ') || 'N/A').replace(/"/g, '""')}"`
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
      ) : results.length > 0 ? (        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Filtered Results ({results.length} entries)</CardTitle>              <SortControls 
                sortOptions={METRIC_SORT_OPTIONS}
                currentSort={sortConfig}
                onSortChange={(field) => setSortConfig(toggleSort(sortConfig, field))}
              />
            </div>
          </CardHeader>
          <CardContent>            <div className="space-y-4">              {sortData(results, sortConfig, 'metrics').map((result, index) => (
                <div key={index} className="border rounded-lg p-6 hover:bg-gray-50 transition-colors">
                  {/* Sailing Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-1">
                      <div>
                        <div className="text-sm font-medium text-gray-500">Ship</div>
                        <div className="font-medium">{result.ship || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Sailing Number</div>
                        <div className="font-medium">{result.sailingNumber || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Average Rating</div>
                        <div className="text-sm">
                          <Badge className={getRatingColor(result.averageRating)} variant="secondary">
                            {result.averageRating?.toFixed(2) || 'N/A'}
                          </Badge>
                          {result.comparisonToOverall !== undefined && (
                            <span className={`ml-2 text-xs ${result.comparisonToOverall >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ({result.comparisonToOverall > 0 ? '+' : ''}{result.comparisonToOverall.toFixed(2)})
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Total Ratings</div>
                        <div className="text-sm">{result.ratingCount || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Filtered Count</div>
                        <Badge variant="outline">{result.filteredCount || 0}</Badge>
                      </div>                    </div>
                    
                  </div>{/* Reviews Section - Always Visible */}
                  {result.filteredReviews && result.filteredReviews.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        📋 Guest Reviews ({result.filteredReviews.length})
                        <Badge variant="outline" className="ml-2 text-xs">Always Visible</Badge>
                      </h4>
                      <div className="space-y-2">
                        {result.filteredReviews.slice(0, 3).map((review: string, reviewIndex: number) => (
                          <div key={reviewIndex} className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                            <FormattedText 
                              text={review} 
                              className="text-gray-700"
                            />
                            {result.filteredMetric && result.filteredMetric[reviewIndex] && (
                              <Badge className={`mt-2 ${getRatingColor(result.filteredMetric[reviewIndex])}`} variant="secondary">
                                Rating: {result.filteredMetric[reviewIndex].toFixed(1)}
                              </Badge>
                            )}
                          </div>
                        ))}
                        {result.filteredReviews.length > 3 && (
                          <div className="text-sm text-blue-600 italic bg-blue-100 p-2 rounded">
                            💡 {result.filteredReviews.length - 3} more reviews available - click expand below to see detailed comments
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Collapsible Comments Section */}
                  <Collapsible open={expandedRows.has(index)}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between mb-4"
                        onClick={() => toggleRowExpansion(index)}
                      >
                        <span className="flex items-center">
                          💬 Detailed Comments ({result.filteredComments?.length || 0})
                        </span>
                        {expandedRows.has(index) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t pt-4 mt-2">
                        <div className="text-sm font-medium text-gray-600 mb-3 flex items-center">
                          <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium mr-2">EXPANDED VIEW</span>
                          All Detailed Comments & Feedback
                        </div>
                        {result.filteredComments && result.filteredComments.length > 0 ? (
                          <div className="space-y-3 max-h-96 overflow-y-auto apollo-scrollbar bg-gray-50 p-4 rounded-lg">
                            {result.filteredComments.map((comment: string, commentIndex: number) => (
                              <div key={commentIndex} className="text-sm text-gray-700 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-xs text-gray-500 font-medium">Comment #{commentIndex + 1}</span>
                                  {result.filteredMetric && result.filteredMetric[commentIndex] && (
                                    <Badge className={`${getRatingColor(result.filteredMetric[commentIndex])}`} variant="secondary">
                                      {result.filteredMetric[commentIndex].toFixed(1)}
                                    </Badge>
                                  )}
                                </div>
                                <FormattedText 
                                  text={comment} 
                                  className="text-gray-700 leading-relaxed"
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 bg-gray-50 rounded-lg">
                            <p className="text-gray-500 italic">📝 No detailed comments available for this sailing</p>
                          </div>
                        )}
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
