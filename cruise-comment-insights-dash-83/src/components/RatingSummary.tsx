import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Download, BarChart3, Loader2, Table, ChartBar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
        const defaultPayload = {
          filter_by: 'all',
          filters: {}
        };
        
        console.log('RatingSummary: Loading default rating data with all dates:', defaultPayload);
        const response = await apiService.getRatingSummary(defaultPayload);
        console.log('RatingSummary: Default response received:', response);
        console.log('RatingSummary: Default response data:', response.data);
        setRatingsData(response.data || []);
      } catch (error) {
        console.error('RatingSummary: Error loading default ratings:', error);
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
      metrics: ['Overall Holiday', 'Embarkation/Disembarkation', 'Value for Money', 'Pre-Cruise Hotel Accommodation']
    },
    'accommodation': {
      title: 'Onboard Accommodation', 
      metrics: ['Cabins', 'Cabin Cleanliness', 'Crew Friendliness', 'Ship Condition/Cleanliness (Public Areas)']
    },
    'food': {
      title: 'Food & Beverage',
      metrics: ['F&B Quality', 'F&B Staff Service', 'Bar Service', 'Drinks Offering and Menu']
    },
    'activities': {
      title: 'Activities & Services',
      metrics: ['Entertainment', 'Excursions']
    },
    'other': {
      title: 'Other Services',
      metrics: ['Prior Customer Service', 'Flight', 'App Booking']
    }
  };  const handleFilterChange = async (newFilters: any) => {
    console.log('RatingSummary handleFilterChange called with:', newFilters);
    setFilters(newFilters);
    setLoading(true);
    
    try {
      // Format the API request based on backend expectations
      let requestPayload: any;
      
      if (newFilters.useAllDates || newFilters.filter_by === 'all') {
        console.log('Using All Dates mode');
        // All dates filtering
        requestPayload = {
          filter_by: 'all',
          filters: {}
        };
        
        // Add fleet/ship filters if they exist
        if (newFilters.fleets && newFilters.fleets.length > 0) {
          requestPayload.filters.fleets = newFilters.fleets;
        }
        if (newFilters.ships && newFilters.ships.length > 0) {
          requestPayload.filters.ships = newFilters.ships;
        }
        if (newFilters.sailingNumbers && newFilters.sailingNumbers.length > 0) {
          requestPayload.filters.sailing_numbers = newFilters.sailingNumbers;
        }
      } else if (newFilters.fromDate && newFilters.toDate) {
        // Date-based filtering
        requestPayload = {
          filter_by: 'date',
          filters: {
            fromDate: newFilters.fromDate,
            toDate: newFilters.toDate
          }
        };
        
        // Add optional filters if they exist
        if (newFilters.fleets && newFilters.fleets.length > 0) {
          requestPayload.filters.fleets = newFilters.fleets;
        }
        if (newFilters.ships && newFilters.ships.length > 0) {
          requestPayload.filters.ships = newFilters.ships;
        }
        if (newFilters.sailingNumbers && newFilters.sailingNumbers.length > 0) {
          requestPayload.filters.sailing_numbers = newFilters.sailingNumbers;
        }
      } else {
        // Sailing-based filtering - provide default sailings if none specified
        requestPayload = {
          filter_by: 'sailing',
          sailings: newFilters.sailings || [
            { shipName: 'Explorer', sailingNumber: '1' },
            { shipName: 'Explorer 2', sailingNumber: '1' }
          ]
        };
      }      
      console.log('Sending rating summary request:', requestPayload);
      const response = await apiService.getRatingSummary(requestPayload);
      console.log('Rating summary response:', response);
      console.log('Response data:', response.data);
      setRatingsData(response.data || []);
    } catch (error) {
      console.error('Error fetching ratings:', error);
      alert('Failed to fetch ratings data. Please try again.');
      setRatingsData([]);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (ratingsData.length === 0) {
      alert('No data to export');
      return;
    }
    
    // Get current group metrics
    const currentMetrics = ratingGroups[activeGroup as keyof typeof ratingGroups].metrics;
    const headers = ['Ship Name', 'Sailing Number', 'Fleet', 'Start', 'End', ...currentMetrics];
    
    const csvContent = ratingsData.map(row => 
      headers.map(header => `"${row[header] || 'N/A'}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([`${headers.join(',')}\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rating-summary-${activeGroup}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const getRatingColor = (rating: number | string) => {
    const numRating = typeof rating === 'string' ? parseFloat(rating) : rating;
    if (isNaN(numRating)) return 'bg-gray-100 text-gray-800';
    if (numRating >= 8) return 'bg-green-100 text-green-800';
    if (numRating >= 6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const generateChartData = (groupKey: string) => {
    const group = ratingGroups[groupKey as keyof typeof ratingGroups];
    
    return ratingsData.map((rating, index) => {
      const chartItem: any = {
        ship: `${rating['Ship Name'] || 'Unknown'} (${rating['Sailing Number'] || 'N/A'})`,
        shipShort: rating['Ship Name'] || 'Unknown',
        sailing: rating['Sailing Number'] || 'N/A',
        fleet: rating['Fleet'] || 'N/A',
      };
      
      // Add all metrics for the group
      group.metrics.forEach(metric => {
        chartItem[metric] = rating[metric] ? parseFloat(rating[metric]) : 0;
      });
      
      return chartItem;
    });
  };

  const renderChart = (groupKey: string) => {
    const group = ratingGroups[groupKey as keyof typeof ratingGroups];
    const chartData = generateChartData(groupKey);
    
    // Color palette for different metrics
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];
    
    return (
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="shipShort" 
              angle={-45}
              textAnchor="end"
              height={100}
              interval={0}
            />
            <YAxis 
              domain={[0, 10]}
              label={{ value: 'Rating', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value: any, name: string) => [value?.toFixed(1), name]}
              labelFormatter={(label) => {
                const item = chartData.find(d => d.shipShort === label);
                return item ? `${item.ship} (${item.fleet} Fleet)` : label;
              }}
            />
            <Legend />
            {group.metrics.map((metric, index) => (
              <Bar 
                key={metric} 
                dataKey={metric} 
                fill={colors[index % colors.length]}
                name={metric}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
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
        ) : ratingsData.length === 0 ? (
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
          <div>
            {viewMode === 'chart' ? (
              <Card>
                <CardContent className="pt-6">
                  {renderChart(groupKey)}
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-b">Ship Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-b">Sailing</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-b">Fleet</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-b">Period</th>
                      {group.metrics.map((metric) => (
                        <th key={metric} className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-b">
                          {metric}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {ratingsData.map((rating, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {rating['Ship Name'] || 'N/A'}
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
  };
  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <BasicFilter 
        onFilterChange={handleFilterChange}
        showTitle={true}
        compact={false}
        className="mb-6"
      />
      
      {/* Data Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
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
