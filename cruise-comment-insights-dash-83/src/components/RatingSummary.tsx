import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Download, Loader2, Table, ChartBar, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { apiService } from '../services/api';
import BasicFilter from './BasicFilter';
import { BasicFilterState, createRatingSummaryApiData, debugFilters, formatShipName } from '../utils/filterUtils';
import { sortData, toggleSort, SortConfig, RATING_SUMMARY_SORT_OPTIONS } from '../utils/sortingUtils';
import { useFilter } from '../contexts/FilterContext';

const RatingSummary = () => {
  const { filterState } = useFilter(); // Use shared filter context
  const [ratingsData, setRatingsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState('overall');  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'start_date', direction: 'asc' });

  // Fetch metrics from backend
  const { data: metricsData } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => apiService.getMetrics(),
  });

  // Load default data on component mount
  useEffect(() => {
    const loadDefaultData = async () => {
      try {
        setLoading(true);
        // Use modern filter format - get all recent data
        const defaultPayload = {
          ships: ['explorer', 'explorer 2', 'discovery', 'discovery 2', 'voyager'],
          fleets: ['marella'],
          start_date: "-1", // All dates
          end_date: "-1",   // All dates
          sailing_numbers: []
        };
          console.log('RatingSummary: Loading default rating data:', defaultPayload);
        const response = await apiService.getRatingSummary(defaultPayload);
        console.log('RatingSummary: Default response received:', response);
        
        if (response && response.data) {
          const sortedData = sortDataByStartDate(Array.isArray(response.data) ? response.data : []);
          setRatingsData(sortedData);
          console.log('RatingSummary: Default data loaded and sorted by start date, count:', sortedData.length);
        } else {
          console.warn('RatingSummary: No data received from API');
          setRatingsData([]);
        }
      } catch (error) {
        console.error('RatingSummary: Error loading default ratings:', error);
        
        // More detailed error logging
        if (error instanceof Error) {
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
        
        setRatingsData([]);
      } finally {
        setLoading(false);
      }
    };

    loadDefaultData();
  }, []);

  // Rating groups as per specifications
  const ratingGroups = {
    'overall': {
      title: 'Overall & Pre/Post',
      metrics: ['Overall Holiday', 'Embarkation/Disembarkation', 'Value for Money', 'Pre-Cruise Hotel Accommodation', 'sentiment_score']
    },
    'accommodation': {
      title: 'Onboard Accommodation', 
      metrics: ['Cabins', 'Cabin Cleanliness', 'Crew Friendliness', 'Ship Condition/Cleanliness (Public Areas)']
    },
    'food': {
      title: 'Food & Beverage',
      metrics: ['F&B Quality', 'F&B Staff Service', 'Bar Staff Service', 'Drinks Offering and Menu']
    },
    'activities': {
      title: 'Activities & Services',
      metrics: ['Entertainment', 'Excursions']
    },
    'other': {
      title: 'Other Services',
      metrics: ['Pre-Cruise Customer Service', 'Flight', 'App Booking']
    }
  };  // Helper function to extract and parse start date from sailing number
  const extractStartDate = (sailingNumber: string): Date | null => {
    if (!sailingNumber) return null;
    
    console.log('Extracting date from sailing number:', sailingNumber);
      // Extract date from sailing number format like "MEX-10-17Jan-AtlanticIslands" or "MEX-14-20March-CanarianFlavours"
    const dateMatch = sailingNumber.match(/(\d{1,2})([A-Za-z]{3,})/);
    if (!dateMatch) {
      console.log('No date match found for:', sailingNumber);
      return null;
    }
    
    const day = parseInt(dateMatch[1]);
    const monthStr = dateMatch[2].toLowerCase().substring(0, 3); // Take first 3 characters
    
    console.log('Parsed day:', day, 'month:', monthStr);
    
    // Map month abbreviations to numbers
    const monthMap: { [key: string]: number } = {
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
      'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };
    
    const month = monthMap[monthStr];
    if (month === undefined) {
      console.log('Unknown month abbreviation:', monthStr);
      return null;
    }
    
    // Assume current year for now, you can adjust this logic as needed
    const year = new Date().getFullYear();
    
    try {
      const date = new Date(year, month, day);
      console.log('Created date:', date);
      return date;
    } catch (error) {
      console.warn('Failed to parse date from sailing number:', sailingNumber, error);
      return null;
    }
  };

  // Helper function to format date for display
  const formatStartDate = (sailingNumber: string): string => {
    const date = extractStartDate(sailingNumber);
    if (!date) return 'N/A';
    
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };
  // Sort ratings data by start date
  const sortDataByStartDate = (data: any[]): any[] => {
    if (!Array.isArray(data)) return [];
    
    console.log('Sorting data by start date. Input data count:', data.length);
    
    const sortedData = [...data].sort((a, b) => {
      const dateA = extractStartDate(a['Sailing Number']);
      const dateB = extractStartDate(b['Sailing Number']);
      
      console.log('Comparing:', a['Sailing Number'], 'vs', b['Sailing Number']);
      console.log('DateA:', dateA, 'DateB:', dateB);
      
      // Put entries without valid dates at the end
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      const result = dateA.getTime() - dateB.getTime();
      console.log('Sort result:', result);
      return result;
    });
    
    console.log('Data sorted. Final order:', sortedData.map(d => d['Sailing Number']));
    return sortedData;
  };  const handleFilterChange = async (newFilters: BasicFilterState) => {
    debugFilters('RatingSummary handleFilterChange called', newFilters);
    // No need to set filters locally since we're using FilterContext
    setLoading(true);
    
    try {
      const requestPayload = createRatingSummaryApiData(filterState);
      
      debugFilters('RatingSummary: Sending request with payload', requestPayload);
      const response = await apiService.getRatingSummary(requestPayload);
      console.log('Rating summary response:', response);
      console.log('Response data type:', typeof response.data);
      
      // Handle different response formats
      let responseData;
      if (response?.data) {
        responseData = response.data;
        // If the data is a string (JSON), parse it
        if (typeof responseData === 'string') {
          try {
            responseData = JSON.parse(responseData);
            console.log('Parsed JSON string to object/array');
          } catch (parseError) {
            console.error('Failed to parse JSON string:', parseError);
            responseData = [];
          }
        }
      } else if (Array.isArray(response)) {
        responseData = response;
      } else {
        responseData = [];
      }        
      if (Array.isArray(responseData)) {
        const sortedData = sortDataByStartDate(responseData);
        setRatingsData(sortedData);
        console.log('RatingSummary: Data loaded and sorted by start date, count:', sortedData.length);      } else if (responseData && typeof responseData === 'object' && responseData.length !== undefined) {
        // Sometimes arrays can lose their Array prototype, try to convert
        const arrayData = Array.from(responseData);
        const sortedData = sortDataByStartDate(arrayData);
        setRatingsData(sortedData);
        console.log('RatingSummary: Data converted to array and sorted by start date, count:', sortedData.length);
      } else {
        console.warn('RatingSummary: Response data is not an array:', responseData);
        setRatingsData([]);
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
      alert('Failed to fetch ratings data. Please try again.');
      setRatingsData([]);
    } finally {
      setLoading(false);
    }
  };  const exportToExcel = () => {
    if (!Array.isArray(ratingsData) || ratingsData.length === 0) {
      alert('No data to export');
      return;
    }

    // Get all metrics from all groups
    const allMetrics = Object.values(ratingGroups).flatMap(group => group.metrics);
    const headers = ['Ship', 'Sailing Number', 'Start Date', 'Fleet', ...allMetrics];
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...ratingsData.map(rating => 
        headers.map(header => {
          if (header === 'Start Date') {
            return formatStartDate(rating['Sailing Number']);
          }
          const value = rating[header];
          return value !== null && value !== undefined ? value : 'N/A';
        }).join(',')
      )
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'rating_summary.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  // Helper function to get color based on rating value
  const getRatingColor = (rating: number | null) => {
    if (rating === null || rating === undefined) {
      return 'bg-gray-100 text-gray-500';
    }
    
    if (rating >= 8) {
      return 'bg-green-100 text-green-800';
    } else if (rating >= 6) {
      return 'bg-yellow-100 text-yellow-800';
    } else if (rating >= 4) {
      return 'bg-orange-100 text-orange-800';
    } else {
      return 'bg-red-100 text-red-800';
    }
  };  const generateChartData = (groupKey: string) => {
    const group = ratingGroups[groupKey as keyof typeof ratingGroups];
    
    if (!Array.isArray(ratingsData) || ratingsData.length === 0) {
      return [];
    }
    
    return ratingsData.map((rating, index) => {      const chartItem: any = {
        sailingNumber: rating['Sailing Number'] || 'N/A',
        ship: formatShipName(rating['Ship']),
        fleet: rating['Fleet'] || 'N/A',
        fullShipName: `${formatShipName(rating['Ship'])} (${rating['Sailing Number'] || 'N/A'})`,
      };
      
      // Add all metrics for the group
      group.metrics.forEach(metric => {
        chartItem[metric] = rating[metric] ? parseFloat(rating[metric]) : null;
      });
      
      return chartItem;
    });
  };

  // Handle sorting
  const handleSort = (key: string) => {
    const newConfig = toggleSort(sortConfig, key);
    setSortConfig(newConfig);
  };
  // Get sorted data for display
  const getSortedData = () => {
    if (!Array.isArray(ratingsData) || ratingsData.length === 0) {
      return [];
    }
    
    if (!sortConfig) return ratingsData;
    
    return [...ratingsData].sort((a, b) => {
      let aValue, bValue;
      
      if (sortConfig.key === 'ship_name') {
        aValue = formatShipName(a['Ship']);
        bValue = formatShipName(b['Ship']);
      } else if (sortConfig.key === 'sailing_number') {
        aValue = a['Sailing Number'];
        bValue = b['Sailing Number'];
      } else if (sortConfig.key === 'start_date') {
        aValue = extractStartDate(a['Sailing Number']);
        bValue = extractStartDate(b['Sailing Number']);
      } else if (sortConfig.key === 'fleet') {
        aValue = a['Fleet'];
        bValue = b['Fleet'];
      } else {
        return 0;
      }
      
      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
      
      // Handle different data types
      let result = 0;
      if (aValue instanceof Date && bValue instanceof Date) {
        result = aValue.getTime() - bValue.getTime();
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        result = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
      } else {
        result = String(aValue).toLowerCase().localeCompare(String(bValue).toLowerCase());
      }
      
      return sortConfig.direction === 'asc' ? result : -result;
    });
  };

  // Generate unique colors for each ship
  const getShipColors = () => {
    const uniqueShips = [...new Set(ratingsData.map(r => r['Ship']))];
    const shipColors: { [key: string]: string } = {};
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
      '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
    ];
    
    uniqueShips.forEach((ship, index) => {
      shipColors[ship] = colors[index % colors.length];
    });
    
    return shipColors;
  };

  // Helper function to get user-friendly display names for metrics
  const getMetricDisplayName = (apiFieldName: string): string => {
    const displayNameMap: { [key: string]: string } = {
      'Overall Holiday': 'Overall Holiday',
      'Embarkation/Disembarkation': 'Embarkation/Disembarkation',
      'Value for Money': 'Value for Money',
      'Pre-Cruise Hotel Accommodation': 'Pre-Cruise Hotel Accommodation',
      'sentiment_score': 'Sentiment Score',
      'Cabins': 'Cabins',
      'Cabin Cleanliness': 'Cabin Cleanliness',
      'Crew Friendliness': 'Crew Friendliness',
      'Ship Condition/Cleanliness (Public Areas)': 'Ship Condition/Cleanliness (Public Areas)',
      'F&B Quality': 'F&B Quality',
      'F&B Staff Service': 'F&B Service',
      'Bar Staff Service': 'Bar Service',
      'Drinks Offering and Menu': 'Drinks Offerings and Menu',
      'Entertainment': 'Entertainment',
      'Excursions': 'Excursions',
      'Pre-Cruise Customer Service': 'Prior Customer Service',
      'Flight': 'Flight',
      'App Booking': 'App Booking'
    };
    
    return displayNameMap[apiFieldName] || apiFieldName;
  };

  const renderMetricChart = (metric: string, groupKey: string) => {
    const chartData = generateChartData(groupKey);
    const shipColors = getShipColors();
    
    if (!chartData || chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No data available for {metric}</p>
        </div>
      );
    }

    // Filter out entries where the metric value is null
    const filteredData = chartData.filter(item => item[metric] !== null);
    
    return (
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={filteredData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
            <XAxis 
              dataKey="sailingNumber" 
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
              tick={{ fontSize: 10 }}
            />
            <YAxis 
              domain={[0, 10]}
              label={{ value: 'Rating', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value: any) => [value?.toFixed(1), getMetricDisplayName(metric)]}
              labelFormatter={(label) => {
                const item = filteredData.find(d => d.sailingNumber === label);
                return item ? `${item.ship} - ${label}` : label;
              }}
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px'
              }}
            />            <Bar 
              dataKey={metric} 
              radius={[4, 4, 0, 0]}
            >
              {filteredData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={shipColors[entry.ship] || '#3B82F6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };
  const renderChartsForGroup = (groupKey: string) => {
    const group = ratingGroups[groupKey as keyof typeof ratingGroups];
    const shipColors = getShipColors();
    const uniqueShips = [...new Set(ratingsData.map(r => r['Ship']))];
    
    return (
      <div className="space-y-8">
        {/* Ship Color Legend */}
        <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
          <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Ship Colors:</h4>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {uniqueShips.map(ship => (
              <div key={ship} className="flex items-center gap-1 sm:gap-2">
                <div 
                  className="w-3 h-3 sm:w-4 sm:h-4 rounded flex-shrink-0" 
                  style={{ backgroundColor: shipColors[ship] }}
                ></div>
                <span className="text-xs sm:text-sm text-gray-700 break-words">{ship}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Individual Metric Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {group.metrics.map((metric) => (
            <Card key={metric} className="apollo-shadow bg-white/90 backdrop-blur-sm border-white/20">
              <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
                <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                  {getMetricDisplayName(metric)}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                {renderMetricChart(metric, groupKey)}
              </CardContent>
            </Card>          ))}
        </div>
      </div>
    );
  };

  const renderRatingGroup = (groupKey: string) => {
    const group = ratingGroups[groupKey as keyof typeof ratingGroups];
    
    return (
      <div className="space-y-6">
        <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
          <h3 className="text-lg font-semibold text-gray-900">{group.title}</h3>
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:gap-2">
            {/* View Toggle */}
            <div className="flex items-center rounded-lg border border-gray-200 p-1 w-full sm:w-auto">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="flex items-center gap-1 flex-1 sm:flex-none justify-center"
              >
                <Table className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Table</span>
              </Button>
              <Button
                variant={viewMode === 'chart' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('chart')}
                className="flex items-center gap-1 flex-1 sm:flex-none justify-center"
              >
                <ChartBar className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Chart</span>
              </Button>
            </div>
            
            <Button onClick={exportToExcel} variant="outline" size="sm" className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              <span className="text-xs sm:text-sm">Export Excel</span>
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading ratings data...</span>
          </div>
        ) : (!Array.isArray(ratingsData) || ratingsData.length === 0) ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No rating data available</p>
                <p className="text-sm">Apply filters and click the button to fetch rating data</p>
              </div>
            </CardContent>
          </Card>
        ) : (          <div>            {viewMode === 'chart' ? (
              renderChartsForGroup(groupKey)
            ) : (              <div className="space-y-4">
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-full inline-block align-middle">
                    <table className="w-full bg-white border border-gray-200 rounded-lg min-w-[800px]">
                      <thead className="bg-gray-50">
                        <tr>
                          {renderSortableHeader('ship_name', 'Ship')}
                          {renderSortableHeader('sailing_number', 'Sailing')}
                          {renderSortableHeader('fleet_name', 'Fleet')}
                          {renderSortableHeader('start_date', 'Start Date')}
                          {group.metrics.map((metric) => (
                            <th key={metric} className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-900 border-b cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort(metric)}>
                              <div className="flex items-center space-x-1">
                                <span className="truncate">{getMetricDisplayName(metric)}</span>
                                <div className="flex flex-col flex-shrink-0">
                                  {(!sortConfig || sortConfig.key !== metric) && <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                                  {sortConfig?.key === metric && sortConfig.direction === 'asc' && <ChevronUp className="h-3 w-3 text-blue-600" />}
                                  {sortConfig?.key === metric && sortConfig.direction === 'desc' && <ChevronDown className="h-3 w-3 text-blue-600" />}
                                </div>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {getSortedData().map((rating, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900">
                              {formatShipName(rating['Ship'])}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                              {rating['Sailing Number'] || 'N/A'}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 capitalize">
                              {rating['Fleet'] || 'N/A'}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                              {formatStartDate(rating['Sailing Number'])}
                            </td>
                            {group.metrics.map((metric) => (
                              <td key={metric} className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                                <Badge 
                                  className={`${getRatingColor(rating[metric])} text-xs`}
                                  variant="secondary"
                                >
                                  {rating[metric]?.toFixed(1) || 'N/A'}
                                </Badge>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };  // Debug function to test date parsing with sample data
  const testDateParsing = () => {
    const sampleSailings = [
      "MEX-10-17Jan-AtlanticIslands",
      "MEX-14-20March-CanarianFlavours", 
      "MEX-14-21Feb-CanarianFlavours"
    ];
    
    console.log('=== DATE PARSING TEST ===');
    sampleSailings.forEach(sailing => {
      const date = extractStartDate(sailing);
      const formatted = formatStartDate(sailing);
      console.log(`${sailing} -> ${date} -> ${formatted}`);
    });
    console.log('=== END DATE PARSING TEST ===');
  };

  // Test the date parsing on component mount (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      testDateParsing();
    }
  }, []);

  // Helper function to render sortable table headers with arrows
  const renderSortableHeader = (columnKey: string, label: string) => {
    const isActive = sortConfig?.key === columnKey;
    const direction = isActive ? sortConfig.direction : null;
    
    return (
      <th 
        className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-900 border-b cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => handleSort(columnKey)}
      >
        <div className="flex items-center space-x-1">
          <span className="truncate">{label}</span>
          <div className="flex flex-col flex-shrink-0">
            {!isActive && <ArrowUpDown className="h-3 w-3 text-gray-400" />}
            {isActive && direction === 'asc' && <ChevronUp className="h-3 w-3 text-blue-600" />}
            {isActive && direction === 'desc' && <ChevronDown className="h-3 w-3 text-blue-600" />}
          </div>
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8 px-4 sm:px-0">
      {/* Filters Section */}
      <BasicFilter 
        onFilterChange={handleFilterChange}
        showTitle={true}
        compact={false}
        className="mb-6 sm:mb-8"
      />
      
      {/* Data Section */}
      <Card className="apollo-shadow bg-white/95 backdrop-blur-sm border-white/20">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 sm:gap-3 text-xl sm:text-2xl">
            <div className="apollo-gradient-primary p-1.5 sm:p-2 rounded-lg flex-shrink-0">
              <BarChart3 className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
            </div>
            <span className="truncate">Rating Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">          
          <Tabs value={activeGroup} onValueChange={setActiveGroup} className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1 h-auto p-2">
              <TabsTrigger value="overall" className="text-xs sm:text-sm px-2 py-2 whitespace-nowrap">
                <span className="hidden sm:inline">Overall & Pre/Post</span>
                <span className="sm:hidden">Overall</span>
              </TabsTrigger>
              <TabsTrigger value="accommodation" className="text-xs sm:text-sm px-2 py-2 whitespace-nowrap">
                <span className="hidden sm:inline">Accommodation</span>
                <span className="sm:hidden">Rooms</span>
              </TabsTrigger>
              <TabsTrigger value="food" className="text-xs sm:text-sm px-2 py-2 whitespace-nowrap">
                <span className="hidden sm:inline">Food & Beverage</span>
                <span className="sm:hidden">Food</span>
              </TabsTrigger>
              <TabsTrigger value="activities" className="text-xs sm:text-sm px-2 py-2 whitespace-nowrap">
                <span className="hidden sm:inline">Activities</span>
                <span className="sm:hidden">Events</span>
              </TabsTrigger>
              <TabsTrigger value="other" className="text-xs sm:text-sm px-2 py-2 whitespace-nowrap">
                <span className="hidden sm:inline">Other</span>
                <span className="sm:hidden">Other</span>
              </TabsTrigger>
            </TabsList>

            {Object.keys(ratingGroups).map((groupKey) => (
              <TabsContent key={groupKey} value={groupKey}>
                {renderRatingGroup(groupKey)}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default RatingSummary;
