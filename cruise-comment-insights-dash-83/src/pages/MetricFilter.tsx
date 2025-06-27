import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, Filter, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react';
import { apiService } from '../services/api';
import { useQuery } from '@tanstack/react-query';
import BasicFilter from '../components/BasicFilter';
import { FormattedText } from '../components/FormattedText';
import { BasicFilterState, createMetricRatingApiData, debugFilters, formatShipName } from '../utils/filterUtils';
import { sortData, toggleSort, SortConfig, METRIC_SAILING_SORT_OPTIONS, METRIC_COMMENT_SORT_OPTIONS } from '../utils/sortingUtils';
import { useFilter } from '../contexts/FilterContext';

const MetricFilter = () => {
  const { filterState } = useFilter(); // Use shared filter context
  const basicFilterRef = useRef<{ applyFilters: () => void; hasPendingChanges: () => boolean }>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>(''); // Changed to single metric
  const [ratingRange, setRatingRange] = useState<number[]>([6, 10]);
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastAppliedFilters, setLastAppliedFilters] = useState<any>(null); // Track applied filters

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());  // Changed to string for comment IDs
  const [sailingSortConfig, setSailingSortConfig] = useState<SortConfig | null>(null);
  const [commentSortConfig, setCommentSortConfig] = useState<SortConfig | null>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'reviews'>('summary'); // Add view switching

  // Fetch available metrics from API
  const { data: metricsData, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => apiService.getMetrics(),
  });  const handleFilterChange = (filterData: BasicFilterState) => {
    debugFilters('Filter data received in MetricFilter', filterData);
    // No need to set local state since we're using FilterContext
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

    // Auto-apply basic filters if they have pending changes
    if (basicFilterRef.current?.hasPendingChanges()) {
      console.log('Auto-applying basic filters before metric search...');
      basicFilterRef.current.applyFilters();
      // Small delay to ensure filters are applied
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsLoading(true);
    try {
      const searchData = createMetricRatingApiData(filterState, selectedMetric, {
        filterLower: ratingRange[0], // Use lower bound of rating range as filter
        filterUpper: ratingRange[1], // Use upper bound of rating range as filter
        compareToAverage: true
      });

      debugFilters('Sending metric filter request', searchData);
      const response = await apiService.getMetricRating(searchData);
      console.log('Metric filter response:', response);
      
      // Handle the backend response structure - it returns sailing data with metric values
      const sailingData = (response as any).data || response.results || [];
      
      // Debug: Log available metrics in the first sailing
      if (sailingData.length > 0) {
        const availableMetrics = Object.keys(sailingData[0]).filter(key => 
          !['Fleet', 'Ship', 'Sailing Number', 'sentiment_score'].includes(key) && 
          sailingData[0][key] !== null && 
          sailingData[0][key] !== undefined
        );
        console.log('Available metrics in response:', availableMetrics);
        console.log('Selected metric:', selectedMetric);
        console.log('Metric value in first sailing:', sailingData[0][selectedMetric]);
        
        // Check if selected metric exists in the response
        const hasSelectedMetric = availableMetrics.includes(selectedMetric);
        if (!hasSelectedMetric) {
          console.warn(`Selected metric "${selectedMetric}" not found in response. Available metrics:`, availableMetrics);
          // Find similar metrics (in case of slight name differences)
          const similarMetrics = availableMetrics.filter(metric => 
            metric.toLowerCase().includes(selectedMetric.toLowerCase()) || 
            selectedMetric.toLowerCase().includes(metric.toLowerCase())
          );
          if (similarMetrics.length > 0) {
            console.warn('Similar metrics found:', similarMetrics);
          }
        }
        
        // Log the complete structure of the first sailing for debugging
        console.log('Complete first sailing data:', {
          Ship: sailingData[0].Ship,
          'Sailing Number': sailingData[0]['Sailing Number'],
          Fleet: sailingData[0].Fleet,
          selectedMetricValue: sailingData[0][selectedMetric],
          allKeys: Object.keys(sailingData[0])
        });
      }
      
      const transformedResults = sailingData
        .filter((sailing: any) => sailing.Ship && sailing['Sailing Number'])
        .map((sailing: any) => {
          // Get the selected metric value using exact field name from response
          const metricValue = sailing[selectedMetric];
          const isValidMetric = metricValue !== null && metricValue !== undefined && !isNaN(Number(metricValue));
          
          // Debug: Log metric value for each sailing
          console.log(`Sailing ${sailing['Sailing Number']}: ${selectedMetric} = ${metricValue} (valid: ${isValidMetric})`);
          
          // Check if the metric value falls within the rating range (for filtering comments)
          // We'll show all sailings but only show filtered results if in range
          const isInRange = isValidMetric && Number(metricValue) >= ratingRange[0] && Number(metricValue) <= ratingRange[1];
          
          return {
            ship: sailing.Ship,
            sailingNumber: sailing['Sailing Number'],
            fleet: sailing.Fleet,
            metric: selectedMetric,
            averageRating: isValidMetric ? Number(metricValue) : null,
            comparisonToOverall: 0, // Not available in this response
            ratingCount: 1, // Assuming 1 rating per sailing for now
            filteredCount: isInRange ? 1 : 0,
            filteredResults: [{
              rating: isValidMetric ? Number(metricValue) : null,
              comment: isValidMetric ? 
                `${selectedMetric} rating for this sailing is ${Number(metricValue).toFixed(2)}. ${isInRange ? 'This falls within your selected range (' + ratingRange[0] + '-' + ratingRange[1] + ').' : 'This is outside your selected range (' + ratingRange[0] + '-' + ratingRange[1] + ').'}` :
                `No ${selectedMetric} data available for this sailing. Available metrics: ${Object.keys(sailing).filter(key => !['Fleet', 'Ship', 'Sailing Number', 'sentiment_score'].includes(key) && sailing[key] !== null).join(', ')}`,
              reason: `${formatShipName(sailing.Ship)} - ${sailing['Sailing Number']}`
            }],
            // Store all metric data for potential future use
            allMetrics: sailing,
            // Flag for debugging
            hasValidMetric: isValidMetric
          };
        });
        // .filter(result => result.averageRating !== null); // Remove this filter to show all sailings
      
      console.log('Transformed results:', transformedResults.map(r => ({
        ship: r.ship,
        sailing: r.sailingNumber,
        metric: r.metric,
        rating: r.averageRating,
        hasValidMetric: r.hasValidMetric
      })));
      
      setResults(transformedResults);
      
      // Store the applied filters for display
      setLastAppliedFilters({
        metric: selectedMetric,
        ratingRange: [...ratingRange],
        ships: filterState.ships,
        dateRange: filterState.dateRange,
        appliedAt: new Date().toLocaleString()
      });
    } catch (error) {
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

    const headers = ['Ship', 'Sailing Number', 'Metric', 'Average Rating', 'Rating', 'Reason', 'Comment'];
    
    // Flatten all comments with their individual ratings
    const csvRows: string[] = [];
    results.forEach(row => {
      if (row.filteredResults && row.filteredResults.length > 0) {
        row.filteredResults.forEach((result: any) => {
          csvRows.push([
            `"${formatShipName(row.ship)}"`,
            `"${row.sailingNumber || 'N/A'}"`,
            `"${row.metric || 'N/A'}"`,
            `"${row.averageRating?.toFixed(2) || 'N/A'}"`,
            `"${result.rating?.toFixed(1) || 'N/A'}"`,
            `"${(result.reason || 'N/A').replace(/"/g, '""')}"`,
            `"${(result.comment || 'N/A').replace(/"/g, '""')}"`
          ].join(','));
        });
      } else {
        // Add a row even if no comments, showing just the summary data
        csvRows.push([
          `"${formatShipName(row.ship)}"`,
          `"${row.sailingNumber || 'N/A'}"`,
          `"${row.metric || 'N/A'}"`,
          `"${row.averageRating?.toFixed(2) || 'N/A'}"`,
          `"N/A"`,
          `"N/A"`,
          `"No comments below threshold"`
        ].join(','));
      }
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([`${headers.join(',')}\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metric-filter-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRatingColor = (rating: number | null | undefined) => {
    if (rating === null || rating === undefined || isNaN(rating)) {
      return 'bg-gray-100 text-gray-500';
    }
    if (rating >= 8) return 'bg-green-100 text-green-800';
    if (rating >= 6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  // Helper function to render sortable table headers with arrows
  const renderSortableHeader = (columnKey: string, label: string, align: 'left' | 'center' = 'left') => {
    const isActive = sailingSortConfig?.key === columnKey;
    const direction = isActive ? sailingSortConfig.direction : null;
    
    const alignClass = align === 'center' ? 'text-center' : 'text-left';
    
    return (
      <th 
        className={`border border-gray-200 px-2 py-2 sm:px-4 sm:py-3 ${alignClass} font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors`}
        onClick={() => setSailingSortConfig(toggleSort(sailingSortConfig, columnKey))}
      >
        <div className="flex flex-col items-center space-y-1 sm:flex-row sm:items-center sm:justify-center sm:space-y-0 sm:space-x-1">
          <span className="text-xs sm:text-sm font-medium text-center">{label}</span>
          <div className="flex justify-center">
            {!isActive && <ArrowUpDown className="h-3 w-3 text-gray-400" />}
            {isActive && direction === 'asc' && <ChevronUp className="h-3 w-3 text-blue-600" />}
            {isActive && direction === 'desc' && <ChevronDown className="h-3 w-3 text-blue-600" />}
          </div>
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-6 px-2 sm:px-4 lg:px-6 max-w-full overflow-hidden">
      <div className="flex flex-col gap-4 w-full">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Metric Filter</h1>
          <p className="text-gray-600 text-sm sm:text-base">Filter comments by rating metrics and ranges</p>
        </div>
        {results.length > 0 && (
          <div className="w-full">
            <Button onClick={exportResults} className="flex items-center justify-center gap-2 w-full sm:w-auto sm:max-w-xs">
              <Download className="h-4 w-4" />
              <span>Export Results ({results.length})</span>
            </Button>
          </div>
        )}
      </div>

      {/* Filters Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <BasicFilter 
          ref={basicFilterRef}
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
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 text-xs sm:text-sm text-gray-500 mt-2">
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

            {/* Filter Applied Status */}
            {lastAppliedFilters && (
              <div className="mt-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                  <span className="text-xs sm:text-sm font-medium text-green-800">Filters Applied</span>
                </div>
                <div className="text-xs text-green-700 space-y-1">
                  <div className="break-words"><strong>Metric:</strong> {lastAppliedFilters.metric}</div>
                  <div><strong>Rating Range:</strong> {lastAppliedFilters.ratingRange[0]} - {lastAppliedFilters.ratingRange[1]}</div>
                  <div className="break-words"><strong>Ships:</strong> {lastAppliedFilters.ships?.length > 0 ? lastAppliedFilters.ships.join(', ') : 'All'}</div>
                  <div className="break-words"><strong>Applied:</strong> {lastAppliedFilters.appliedAt}</div>
                </div>
              </div>
            )}
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
          {/* Show warning if no valid data found */}
          {results.length > 0 && results.every(r => r.averageRating === null) && (
            <Card>
              <CardContent className="py-6">
                <div className="text-center text-amber-600">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">⚠️</span>
                    <span className="font-semibold">No Valid Data Found</span>
                  </div>
                  <p className="text-sm">
                    The selected metric "{selectedMetric}" was not found in the response data. 
                    Please check the console for available metrics or try selecting a different metric.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* View Toggle Buttons */}
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-center sm:space-y-0 sm:space-x-4">
                <Button
                  variant={viewMode === 'summary' ? 'default' : 'outline'}
                  onClick={() => setViewMode('summary')}
                  className="flex items-center justify-center space-x-2 w-full sm:w-auto min-h-[44px] px-4 sm:px-6 py-3 text-sm"
                >
                  <span>📊</span>
                  <span className="whitespace-nowrap">Summary & Averages</span>
                </Button>
                <Button
                  variant={viewMode === 'reviews' ? 'default' : 'outline'}
                  onClick={() => setViewMode('reviews')}
                  className="flex items-center justify-center space-x-2 w-full sm:w-auto min-h-[44px] px-4 sm:px-6 py-3 text-sm"
                >
                  <span>💬</span>
                  <span className="whitespace-nowrap">Individual Guest Reviews</span>
                </Button>
              </div>
            </CardContent>
          </Card>          {/* Summary/Averages Table */}
          {viewMode === 'summary' && (
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <CardTitle className="flex flex-col gap-2">
                    <span className="text-lg sm:text-xl">📊 Summary Statistics ({results.length} sailings)</span>
                    <Badge variant="secondary" className="text-xs sm:text-sm px-3 py-1 w-fit">
                      Average Data
                    </Badge>
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="min-w-full inline-block align-middle">
                  <table className="w-full border-collapse border border-gray-200 rounded-lg min-w-[400px] sm:min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-50">
                      {renderSortableHeader('ship', 'Ship')}
                      {renderSortableHeader('sailingNumber', 'Sailing')}
                      {renderSortableHeader('averageRating', 'Rating', 'center')}
                      <th className="border border-gray-200 px-2 py-2 text-center font-medium text-gray-700 text-xs sm:text-sm hidden sm:table-cell">
                        Data Points
                      </th>
                      {renderSortableHeader('filteredCount', 'In Range', 'center')}
                    </tr>
                  </thead>
                  <tbody>
                    {sortData(results, sailingSortConfig, 'metrics').map((result, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-2 py-2 sm:px-4 sm:py-3 font-medium text-xs sm:text-sm">
                          <div className="max-w-[100px] sm:max-w-none truncate sm:whitespace-normal">
                            {formatShipName(result.ship)}
                          </div>
                        </td>
                        <td className="border border-gray-200 px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                          <div className="max-w-[120px] sm:max-w-none truncate sm:whitespace-normal">
                            {result.sailingNumber || 'N/A'}
                          </div>
                        </td>
                        <td className="border border-gray-200 px-2 py-2 sm:px-4 sm:py-3 text-center">
                          {result.averageRating !== null && result.averageRating !== undefined ? (
                            <Badge className={`${getRatingColor(result.averageRating)} text-xs whitespace-nowrap`} variant="secondary">
                              {result.averageRating.toFixed(2)}
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-500 text-xs whitespace-nowrap" variant="secondary">
                              No Data
                            </Badge>
                          )}
                        </td>
                        <td className="border border-gray-200 px-2 py-2 sm:px-4 sm:py-3 text-center text-xs sm:text-sm hidden sm:table-cell">
                          1
                        </td>
                        <td className="border border-gray-200 px-2 py-2 sm:px-4 sm:py-3 text-center">
                          <Badge 
                            variant={result.filteredCount > 0 ? "default" : "outline"} 
                            className={`text-xs whitespace-nowrap ${result.filteredCount > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                          >
                            {result.filteredCount > 0 ? '✓ Yes' : '✗ No'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
          )}          {/* Individual Guest Reviews */}
          {viewMode === 'reviews' && (
          <Card>
            <CardHeader>
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-lg sm:text-xl">💬 Individual Sailing Details</span>
                    <Badge variant="outline" className="text-xs w-fit">
                      {results.length} sailings analyzed
                    </Badge>
                  </CardTitle>
                </div>
                {/* Comment Rating Sort Control */}
                <div className="flex flex-col gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Sort sailings by metric rating:</span>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant={commentSortConfig?.key === 'rating' && commentSortConfig?.direction === 'desc' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCommentSortConfig({ key: 'rating', direction: 'desc' })}
                      className="flex items-center justify-center gap-1 text-xs sm:text-sm px-3 py-2 min-h-[36px] w-full sm:w-auto"
                    >
                      <ChevronDown className="h-3 w-3" />
                      <span>High to Low</span>
                    </Button>
                    <Button
                      variant={commentSortConfig?.key === 'rating' && commentSortConfig?.direction === 'asc' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCommentSortConfig({ key: 'rating', direction: 'asc' })}
                      className="flex items-center justify-center gap-1 text-xs sm:text-sm px-3 py-2 min-h-[36px] w-full sm:w-auto"
                    >
                      <ChevronUp className="h-3 w-3" />
                      <span>Low to High</span>
                    </Button>
                    <Button
                      variant={commentSortConfig === null ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCommentSortConfig(null)}
                      className="flex items-center justify-center gap-1 text-xs sm:text-sm px-3 py-2 min-h-[36px] w-full sm:w-auto"
                    >
                      <ArrowUpDown className="h-3 w-3" />
                      <span>Original Order</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {sortData(results, sailingSortConfig, 'metrics').map((result, sailingIndex) => (
                  <div key={sailingIndex} className="border rounded-lg p-4 sm:p-6 bg-white">
                    {/* Sailing Header */}
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <div className="flex flex-col gap-3">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">
                          {formatShipName(result.ship)} - {result.sailingNumber || 'Unknown Sailing'}
                        </h3>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Badge className={`${getRatingColor(result.averageRating)} w-fit`} variant="secondary">
                            {result.averageRating !== null && result.averageRating !== undefined ? 
                              `Avg: ${result.averageRating.toFixed(2)}` : 
                              'Avg: No Data'
                            }
                          </Badge>
                          <Badge variant="outline" className="text-xs sm:text-sm w-fit">
                            {result.filteredCount > 0 ? 
                              `Within range (${ratingRange[0]}-${ratingRange[1]})` : 
                              `Outside range (${ratingRange[0]}-${ratingRange[1]})`
                            }
                          </Badge>
                        </div>
                      </div>
                    </div>                    {/* Individual Guest Comments */}
                    {result.filteredResults && result.filteredResults.length > 0 ? (
                      <div className="space-y-4">
                        {(() => {
                          // Use the new filteredResults structure directly
                          const commentData = result.filteredResults.map((item: any, index: number) => ({
                            comment: item.comment,
                            rating: item.rating !== undefined && item.rating !== null ? Number(item.rating) : null,
                            reason: item.reason || `Guest #${index + 1}`,
                            originalIndex: index
                          }));
                          
                          console.log('Comment data for debugging:', {
                            filteredResults: result.filteredResults,
                            commentData: commentData.slice(0, 3) // First 3 for debugging
                          });
                            
                          // Sort comments based on commentSortConfig
                          const sortedComments = commentSortConfig 
                            ? commentData.sort((a, b) => {
                                let aValue, bValue;
                                
                                if (commentSortConfig.key === 'rating') {
                                  aValue = a.rating !== null ? a.rating : -1; // Treat null as lowest rating
                                  bValue = b.rating !== null ? b.rating : -1;
                                } else if (commentSortConfig.key === 'review') {
                                  aValue = a.reason.toLowerCase();
                                  bValue = b.reason.toLowerCase();
                                } else {
                                  return 0;
                                }
                                
                                // Handle comparison
                                let result = 0;
                                if (typeof aValue === 'number' && typeof bValue === 'number') {
                                  result = aValue - bValue;
                                } else if (typeof aValue === 'string' && typeof bValue === 'string') {
                                  result = aValue.localeCompare(bValue);
                                }
                                
                                return commentSortConfig.direction === 'asc' ? result : -result;
                              })
                            : commentData;
                          
                          return sortedComments.map((commentData, displayIndex) => {
                            const commentId = `${sailingIndex}-${commentData.originalIndex}`;
                            return (
                              <Collapsible key={commentData.originalIndex} open={expandedRows.has(commentId)}>
                                <div className="border border-gray-200 rounded-lg">
                                  {/* Comment Header - Always Visible */}
                                  <CollapsibleTrigger 
                                    onClick={() => toggleRowExpansion(commentId)}
                                    className="w-full p-3 sm:p-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors min-h-[64px] sm:min-h-[56px]"
                                  >
                                      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-1 min-w-0">
                                          {/* Rating Badge - Always at top on mobile */}
                                          {commentData.rating !== null && commentData.rating !== undefined ? (
                                            <Badge className={`${getRatingColor(commentData.rating)} text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1 flex-shrink-0 w-fit`} variant="secondary">
                                              ⭐ {commentData.rating.toFixed(1)}
                                            </Badge>
                                          ) : (
                                            <Badge className="bg-gray-100 text-gray-500 text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1 flex-shrink-0 w-fit" variant="secondary">
                                              ⭐ N/A
                                            </Badge>
                                          )}
                                          <span className="text-xs sm:text-sm font-medium text-gray-600 break-words min-w-0">
                                            {commentData.reason}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-center sm:justify-end gap-2 flex-shrink-0">
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
                                  </CollapsibleTrigger>
                                    
                                  {/* Collapsible Comment Content */}
                                  <CollapsibleContent>
                                    <div className="p-3 sm:p-4 bg-white">
                                      <div className="border-l-4 border-blue-200 pl-3 sm:pl-4">
                                        <div className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                                          <FormattedText 
                                            text={commentData.comment} 
                                            className="text-gray-700"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <p className="text-gray-500 italic">
                          � Metric data available for this sailing
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
