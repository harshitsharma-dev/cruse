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
  });  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());  // Changed to string for comment IDs
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'reviews'>('summary'); // Add view switching

  // Fetch available metrics from API
  const { data: metricsData, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => apiService.getMetrics(),
  });  const handleFilterChange = (filterData: BasicFilterState) => {
    debugFilters('Filter data received in MetricFilter', filterData);
    setFilters(filterData);
  };
  const toggleRowExpansion = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };  const handleSearch = async () => {
    if (!selectedMetric) {
      alert('Please select a metric');
      return;
    }

    setIsLoading(true);
    try {      const searchData = createMetricRatingApiData(filters, selectedMetric, {
        filterLower: ratingRange[0], // Use lower bound of rating range as filter
        filterUpper: ratingRange[1], // Use upper bound of rating range as filter
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
      </div>      {/* Results Section */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Filtering metric data...</span>
            </div>
          </CardContent>
        </Card>      ) : results.length > 0 ? (
        <div className="space-y-6">
          {/* View Toggle Buttons */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-center space-x-4">
                <Button
                  variant={viewMode === 'summary' ? 'default' : 'outline'}
                  onClick={() => setViewMode('summary')}
                  className="flex items-center space-x-2"
                >
                  <span>📊</span>
                  <span>Summary & Averages</span>
                </Button>
                <Button
                  variant={viewMode === 'reviews' ? 'default' : 'outline'}
                  onClick={() => setViewMode('reviews')}
                  className="flex items-center space-x-2"
                >
                  <span>💬</span>
                  <span>Individual Guest Reviews</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary/Averages Table */}
          {viewMode === 'summary' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                📊 Summary Statistics ({results.length} sailings)
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  Average Data
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200 rounded-lg">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-3 text-left font-medium text-gray-700">Ship</th>
                      <th className="border border-gray-200 px-4 py-3 text-left font-medium text-gray-700">Sailing Number</th>
                      <th className="border border-gray-200 px-4 py-3 text-center font-medium text-gray-700">Average Rating</th>
                      <th className="border border-gray-200 px-4 py-3 text-center font-medium text-gray-700">Total Ratings</th>
                      <th className="border border-gray-200 px-4 py-3 text-center font-medium text-gray-700">Filtered Count</th>
                      <th className="border border-gray-200 px-4 py-3 text-center font-medium text-gray-700">Comparison</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-4 py-3 font-medium">{result.ship || 'N/A'}</td>
                        <td className="border border-gray-200 px-4 py-3">{result.sailingNumber || 'N/A'}</td>
                        <td className="border border-gray-200 px-4 py-3 text-center">
                          <Badge className={getRatingColor(result.averageRating)} variant="secondary">
                            {result.averageRating?.toFixed(2) || 'N/A'}
                          </Badge>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-center">{result.ratingCount || 'N/A'}</td>
                        <td className="border border-gray-200 px-4 py-3 text-center">
                          <Badge variant="outline">{result.filteredCount || 0}</Badge>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-center">
                          {result.comparisonToOverall !== undefined ? (
                            <span className={`text-sm font-medium ${result.comparisonToOverall >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {result.comparisonToOverall > 0 ? '+' : ''}{result.comparisonToOverall.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>            </CardContent>
          </Card>
          )}

          {/* Individual Guest Reviews */}
          {viewMode === 'reviews' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  💬 Individual Guest Comments
                  <Badge variant="outline" className="ml-2 text-xs">
                    {results.reduce((total, result) => total + (result.filteredCount || 0), 0)} total comments
                  </Badge>
                </CardTitle>
                <SortControls 
                  sortOptions={METRIC_SORT_OPTIONS}
                  currentSort={sortConfig}
                  onSortChange={(field) => setSortConfig(toggleSort(sortConfig, field))}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {sortData(results, sortConfig, 'metrics').map((result, sailingIndex) => (
                  <div key={sailingIndex} className="border rounded-lg p-6 bg-white">
                    {/* Sailing Header */}
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {result.ship || 'Unknown Ship'} - {result.sailingNumber || 'Unknown Sailing'}
                          </h3>
                          <Badge className={getRatingColor(result.averageRating)} variant="secondary">
                            Avg: {result.averageRating?.toFixed(2) || 'N/A'}
                          </Badge>
                        </div>
                        <Badge variant="outline" className="text-sm">
                          {result.filteredCount || 0} comments below threshold
                        </Badge>
                      </div>
                    </div>                    {/* Individual Guest Comments */}
                    {result.filteredComments && result.filteredComments.length > 0 ? (
                      <div className="space-y-4">
                        {result.filteredComments.map((comment: string, commentIndex: number) => {
                          const commentId = `${sailingIndex}-${commentIndex}`;
                          return (
                            <Collapsible key={commentIndex}>
                              <div className="border border-gray-200 rounded-lg">
                                {/* Comment Header - Always Visible */}
                                <CollapsibleTrigger asChild>
                                  <div className="p-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center space-x-3">
                                        <span className="text-sm font-medium text-gray-600">
                                          Guest #{commentIndex + 1}
                                        </span>
                                        {result.filteredMetric && result.filteredMetric[commentIndex] && (
                                          <Badge className={getRatingColor(result.filteredMetric[commentIndex])} variant="secondary">
                                            Rating: {result.filteredMetric[commentIndex].toFixed(1)}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-xs text-gray-500">
                                          {expandedRows.has(commentId) ? 'Collapse' : 'Expand'} Comment
                                        </span>
                                        {expandedRows.has(commentId) ? (
                                          <ChevronUp className="h-4 w-4 text-gray-500" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4 text-gray-500" />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </CollapsibleTrigger>
                                
                                {/* Collapsible Comment Content */}
                                <CollapsibleContent>
                                  <div className="p-4 bg-white">
                                    <div className="text-sm text-gray-700 leading-relaxed">
                                      <FormattedText 
                                        text={comment} 
                                        className="text-gray-700"
                                      />
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                      <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>Guest feedback for {selectedMetric}</span>
                                        {result.filteredMetric && result.filteredMetric[commentIndex] && (
                                          <span>
                                            Rated: {result.filteredMetric[commentIndex].toFixed(1)}/10
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <p className="text-gray-500 italic">
                          📝 No guest comments available for this sailing below the threshold
                        </p>
                      </div>
                    )}
                  </div>
                ))}              </div>
            </CardContent>
          </Card>
          )}
        </div>
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
