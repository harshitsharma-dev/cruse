import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Download, BarChart3, Loader2, Table, ChartBar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { apiService } from '../services/api';
import BasicFilter from './BasicFilter';
import { useQuery } from '@tanstack/react-query';

const RatingSummary = () => {
  const [ratingsData, setRatingsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<any>({});
  const [activeGroup, setActiveGroup] = useState('overall');
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  // Fetch metrics from backend
  const { data: metricsData } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => apiService.getMetrics(),
  });  // Load default data on component mount
  useEffect(() => {
    const loadDefaultData = async () => {
      try {
        setLoading(true);
          // Backend expects either "sailing" or "date" filter_by mode
        // For all data, we'll use "sailing" mode with specific sailing objects
        const defaultPayload = {
          filter_by: 'sailing',
          sailings: [
            { shipName: 'Explorer', sailingNumber: '1' },
            { shipName: 'Explorer 2', sailingNumber: '1' },
            { shipName: 'Discovery', sailingNumber: '1' },
            { shipName: 'Discovery 2', sailingNumber: '1' },
            { shipName: 'Voyager', sailingNumber: '1' }
          ]
        };
        
        console.log('RatingSummary: Loading default rating data:', defaultPayload);
        const response = await apiService.getRatingSummary(defaultPayload);
        console.log('RatingSummary: Default response received:', response);
        
        if (response && response.data) {
          setRatingsData(Array.isArray(response.data) ? response.data : []);
          console.log('RatingSummary: Data loaded successfully, count:', response.data.length);
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
  }, []);  // Rating groups as per specifications
  const ratingGroups = {
    'overall': {
      title: 'Overall & Pre/Post',
      metrics: ['Overall Holiday', 'Embarkation/Disembarkation', 'Value for Money', 'Pre-Cruise Hotel Accomodation', 'Sentiment Score']
    },
    'accommodation': {
      title: 'Onboard Accommodation', 
      metrics: ['Cabins', 'Cabin Cleanliness', 'Crew Friendliness', 'Ship Condition/Cleanliness (Public Areas)']
    },
    'food': {
      title: 'Food & Beverage',
      metrics: ['F&B Quality', 'F&B Service', 'Bar Service', 'Drinks Offerings and Menu']
    },
    'activities': {
      title: 'Activities & Services',
      metrics: ['Entertainment', 'Excursions']
    },
    'other': {
      title: 'Other Services',
      metrics: ['Prior Customer Service', 'Flight', 'App Booking']
    }
  };

  const handleFilterChange = async (newFilters: any) => {
    console.log('RatingSummary handleFilterChange called with:', newFilters);
    setFilters(newFilters);
    setLoading(true);
      try {
      // Use the exact payload format that BasicFilter sends, which matches backend expectations
      const requestPayload = newFilters;
      
      console.log('RatingSummary: Sending request with payload:', requestPayload);        const response = await apiService.getRatingSummary(requestPayload);
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
        setRatingsData(responseData);
        console.log('RatingSummary: Data loaded successfully, count:', responseData.length);      } else if (responseData && typeof responseData === 'object' && responseData.length !== undefined) {
        // Sometimes arrays can lose their Array prototype, try to convert
        const arrayData = Array.from(responseData);
        setRatingsData(arrayData);
        console.log('RatingSummary: Data converted to array, count:', arrayData.length);
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
  };
  const exportToExcel = () => {
    if (!Array.isArray(ratingsData) || ratingsData.length === 0) {
      alert('No data to export');
      return;
    }

    // Get all metrics from all groups
    const allMetrics = Object.values(ratingGroups).flatMap(group => group.metrics);
    const headers = ['Ship', 'Sailing Number', 'Fleet', ...allMetrics];
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...ratingsData.map(rating => 
        headers.map(header => {
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
    
    return ratingsData.map((rating, index) => {
      const chartItem: any = {
        sailingNumber: rating['Sailing Number'] || 'N/A',
        ship: rating['Ship'] || 'Unknown',
        fleet: rating['Fleet'] || 'N/A',
        fullShipName: `${rating['Ship'] || 'Unknown'} (${rating['Sailing Number'] || 'N/A'})`,
      };
      
      // Add all metrics for the group
      group.metrics.forEach(metric => {
        chartItem[metric] = rating[metric] ? parseFloat(rating[metric]) : null;
      });
      
      return chartItem;
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
              formatter={(value: any) => [value?.toFixed(1), metric]}
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
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Ship Colors:</h4>
          <div className="flex flex-wrap gap-3">
            {uniqueShips.map(ship => (
              <div key={ship} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded" 
                  style={{ backgroundColor: shipColors[ship] }}
                ></div>
                <span className="text-sm text-gray-700">{ship}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Individual Metric Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {group.metrics.map((metric) => (
            <Card key={metric} className="apollo-shadow bg-white/90 backdrop-blur-sm border-white/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {metric}
                </CardTitle>
              </CardHeader>
              <CardContent>
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
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">{group.title}</h3>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center rounded-lg border border-gray-200 p-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="flex items-center gap-1"
              >
                <Table className="h-4 w-4" />
                Table
              </Button>
              <Button
                variant={viewMode === 'chart' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('chart')}
                className="flex items-center gap-1"
              >
                <ChartBar className="h-4 w-4" />
                Chart
              </Button>
            </div>
            
            <Button onClick={exportToExcel} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Excel
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
        ) : (
          <div>            {viewMode === 'chart' ? (
              renderChartsForGroup(groupKey)
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-b">Ship</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-b">Sailing</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-b">Fleet</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-b">Period</th>
                      {group.metrics.map((metric) => (
                        <th key={metric} className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-b">
                          {metric}
                        </th>
                      ))}
                    </tr>
                  </thead>                  <tbody className="divide-y divide-gray-200">                    {Array.isArray(ratingsData) && ratingsData.map((rating, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {rating['Ship'] || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {rating['Sailing Number'] || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                          {rating['Fleet'] || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {rating['Start'] && rating['End'] ? 
                            `${rating['Start']} - ${rating['End']}` : 'N/A'}
                        </td>
                        {group.metrics.map((metric) => (
                          <td key={metric} className="px-4 py-3 text-sm">
                            <Badge 
                              className={getRatingColor(rating[metric])}
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
            )}
          </div>
        )}
      </div>
    );
  };  return (
    <div className="space-y-8">
      {/* Filters Section */}
      <BasicFilter 
        onFilterChange={handleFilterChange}
        showTitle={true}
        compact={false}
        className="mb-8"
      />
      
      {/* Data Section */}
      <Card className="apollo-shadow bg-white/95 backdrop-blur-sm border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="apollo-gradient-primary p-2 rounded-lg">
              <BarChart3 className="h-7 w-7 text-white" />
            </div>
            Rating Summary
          </CardTitle>
        </CardHeader>
        <CardContent>          
          <Tabs value={activeGroup} onValueChange={setActiveGroup} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overall">Overall & Pre/Post</TabsTrigger>
              <TabsTrigger value="accommodation">Accommodation</TabsTrigger>
              <TabsTrigger value="food">Food & Beverage</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="other">Other</TabsTrigger>
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
