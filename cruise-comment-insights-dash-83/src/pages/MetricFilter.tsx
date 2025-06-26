import React, { useState } from 'react';
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
  const [selectedMetric, setSelectedMetric] = useState<string>(''); // Changed to single metric
  const [ratingRange, setRatingRange] = useState<number[]>([6, 10]);
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
      
      // Use the new backend structure with filteredResults
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
          filteredResults: result.filteredResults || []
        }));
      
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

  const getRatingColor = (rating: number) => {
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
        className={`border border-gray-200 px-4 py-3 ${alignClass} font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors`}
        onClick={() => setSailingSortConfig(toggleSort(sailingSortConfig, columnKey))}
      >
        <div className="flex items-center space-x-1 justify-center">
          <span>{label}</span>
          <div className="flex flex-col">
            {!isActive && <ArrowUpDown className="h-3 w-3 text-gray-400" />}
            {isActive && direction === 'asc' && <ChevronUp className="h-3 w-3 text-blue-600" />}
            {isActive && direction === 'desc' && <ChevronDown className="h-3 w-3 text-blue-600" />}
          </div>
        </div>
      </th>
    );
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

            {/* Filter Applied Status */}
            {lastAppliedFilters && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-800">Filters Applied</span>
                </div>
                <div className="text-xs text-green-700 space-y-1">
                  <div><strong>Metric:</strong> {lastAppliedFilters.metric}</div>
                  <div><strong>Rating Range:</strong> {lastAppliedFilters.ratingRange[0]} - {lastAppliedFilters.ratingRange[1]}</div>
                  <div><strong>Ships:</strong> {lastAppliedFilters.ships?.length > 0 ? lastAppliedFilters.ships.join(', ') : 'All'}</div>
                  <div><strong>Applied:</strong> {lastAppliedFilters.appliedAt}</div>
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
          </Card>          {/* Summary/Averages Table */}
          {viewMode === 'summary' && (
          <Card>
            <CardHeader>              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  📊 Summary Statistics ({results.length} sailings)
                  <Badge variant="secondary" className="text-sm px-3 py-1 ml-2">
                    Average Data                  </Badge>                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200 rounded-lg">
                  <thead>                    <tr className="bg-gray-50">                      {renderSortableHeader('ship', 'Ship')}
                      {renderSortableHeader('sailingNumber', 'Sailing Number')}
                      {renderSortableHeader('averageRating', 'Average Rating', 'center')}
                      {renderSortableHeader('ratingCount', 'Total Ratings', 'center')}
                      {renderSortableHeader('filteredCount', 'Comments Below Threshold', 'center')}
                    </tr>
                  </thead>
                  <tbody>
                    {sortData(results, sailingSortConfig, 'metrics').map((result, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-4 py-3 font-medium">{formatShipName(result.ship)}</td>
                        <td className="border border-gray-200 px-4 py-3">{result.sailingNumber || 'N/A'}</td>
                        <td className="border border-gray-200 px-4 py-3 text-center">
                          <Badge className={getRatingColor(result.averageRating)} variant="secondary">
                            {result.averageRating?.toFixed(2) || 'N/A'}
                          </Badge>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-center">{result.ratingCount || 'N/A'}</td>
                        <td className="border border-gray-200 px-4 py-3 text-center">
                          <Badge variant="outline" className="text-sm">
                            {result.filteredResults?.length || 0}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>            </CardContent>
          </Card>
          )}          {/* Individual Guest Reviews */}
          {viewMode === 'reviews' && (
          <Card>
            <CardHeader>
              <div className="space-y-4">
                <CardTitle className="flex items-center">                  💬 Individual Guest Comments
                  <Badge variant="outline" className="ml-2 text-xs">
                    {results.reduce((total, result) => total + (result.filteredResults?.length || 0), 0)} total comments
                  </Badge>
                </CardTitle>                {/* Comment Rating Sort Control */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Sort comments by rating:</span>
                  <div className="flex gap-2">
                    <Button
                      variant={commentSortConfig?.key === 'rating' && commentSortConfig?.direction === 'desc' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCommentSortConfig({ key: 'rating', direction: 'desc' })}
                      className="flex items-center gap-1"
                    >
                      <ChevronDown className="h-3 w-3" />
                      High to Low
                    </Button>
                    <Button
                      variant={commentSortConfig?.key === 'rating' && commentSortConfig?.direction === 'asc' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCommentSortConfig({ key: 'rating', direction: 'asc' })}
                      className="flex items-center gap-1"
                    >
                      <ChevronUp className="h-3 w-3" />
                      Low to High
                    </Button>
                    <Button
                      variant={commentSortConfig === null ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCommentSortConfig(null)}
                      className="flex items-center gap-1"
                    >
                      <ArrowUpDown className="h-3 w-3" />
                      Original Order
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {sortData(results, sailingSortConfig, 'metrics').map((result, sailingIndex) => (
                  <div key={sailingIndex} className="border rounded-lg p-6 bg-white">
                    {/* Sailing Header */}
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">                          <h3 className="text-lg font-semibold text-gray-900">
                            {formatShipName(result.ship)} - {result.sailingNumber || 'Unknown Sailing'}
                          </h3>
                          <Badge className={getRatingColor(result.averageRating)} variant="secondary">
                            Avg: {result.averageRating?.toFixed(2) || 'N/A'}
                          </Badge>
                        </div>
                        <Badge variant="outline" className="text-sm">
                          {result.filteredResults?.length || 0} comments below threshold
                        </Badge>
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
                                    className="w-full p-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                                  >
                                      <div className="flex justify-between items-center">
                                        <div className="flex items-center space-x-3">
                                          {/* Rating Badge - Prominently displayed at the start */}
                                          {commentData.rating !== null && commentData.rating !== undefined ? (
                                            <Badge className={`${getRatingColor(commentData.rating)} text-sm font-semibold px-3 py-1 flex-shrink-0`} variant="secondary">
                                              ⭐ {commentData.rating.toFixed(1)}
                                            </Badge>
                                          ) : (
                                            <Badge className="bg-gray-100 text-gray-500 text-sm font-semibold px-3 py-1 flex-shrink-0" variant="secondary">
                                              ⭐ N/A
                                            </Badge>
                                          )}
                                          <span className="text-sm font-medium text-gray-600 flex-1">
                                            {commentData.reason}
                                          </span>
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
                                  </CollapsibleTrigger>
                                    
                                  {/* Collapsible Comment Content */}
                                  <CollapsibleContent>
                                    <div className="p-4 bg-white">
                                      <div className="border-l-4 border-blue-200 pl-4">
                                        <div className="text-sm text-gray-700 leading-relaxed">
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
