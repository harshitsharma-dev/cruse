
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Download, BarChart3 } from 'lucide-react';
import { apiService } from '../services/api';
import BasicFilter from './BasicFilter';
import { useQuery } from '@tanstack/react-query';

const RatingSummary = () => {
  const [ratingsData, setRatingsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<any>({});

  // Fetch metrics from backend to create rating groups
  const { data: metricsData } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => apiService.getMetrics(),
  });

  // Dynamic rating groups based on backend metrics
  const ratingGroups = React.useMemo(() => {
    if (!metricsData?.data) return {};
    
    const metrics = metricsData.data;
    return {
      'overall': {
        title: 'Overall & Pre/Post',
        metrics: metrics.filter((m: string) => 
          m.includes('Overall') || m.includes('Value') || m.includes('Prior') || m.includes('Flight') || m.includes('App') || m.includes('Pre-Cruise')
        )
      },
      'accommodation': {
        title: 'Onboard Accommodation',
        metrics: metrics.filter((m: string) => 
          m.includes('Cabin') || m.includes('Crew') || m.includes('Ship Condition')
        )
      },
      'food': {
        title: 'Food & Beverage',
        metrics: metrics.filter((m: string) => 
          m.includes('F&B') || m.includes('Bar') || m.includes('Drinks')
        )
      },
      'activities': {
        title: 'Activities & Services',
        metrics: metrics.filter((m: string) => 
          m.includes('Entertainment') || m.includes('Excursions') || m.includes('Embarkation')
        )
      }
    };
  }, [metricsData]);

  const handleFilterChange = async (newFilters: any) => {
    setFilters(newFilters);
    setLoading(true);
      try {
      const filtersPayload = {
        filter_by: newFilters.useAllDates ? 'all' : 'date',
        filters: {
          fromDate: newFilters.fromDate, // Will be "-1" for all dates
          toDate: newFilters.toDate,     // Will be "-1" for all dates
          fleets: newFilters.fleets || [],
          ships: newFilters.ships || [],
          sailingNumbers: newFilters.sailingNumbers || ['-1']
        }
      };
      
      const response = await apiService.getRatingSummary(filtersPayload);
      setRatingsData(response.data);
    } catch (error) {
      console.error('Error fetching ratings:', error);
      alert('Failed to fetch ratings data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (ratingsData.length === 0) {
      alert('No data to export');
      return;
    }
    
    // Get all available metrics from the data
    const allMetrics = metricsData?.data || [];
    const headers = ['Ship Name', 'Sailing Number', 'Fleet', 'Start', 'End', ...allMetrics];
    
    const csvContent = ratingsData.map(row => 
      headers.map(header => `"${row[header] || 'N/A'}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([`${headers.join(',')}\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rating-summary-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRatingColor = (rating: number | string) => {
    const numRating = typeof rating === 'string' ? parseFloat(rating) : rating;
    if (isNaN(numRating)) return 'bg-gray-100 text-gray-800';
    if (numRating >= 8) return 'bg-green-100 text-green-800';
    if (numRating >= 6) return 'bg-yellow-100 text-yellow-800';
    if (numRating >= 4) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Rating Summary</h1>
        <Button onClick={exportToExcel} className="flex items-center gap-2" disabled={ratingsData.length === 0}>
          <Download className="h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <BasicFilter onFilterChange={handleFilterChange} currentFilters={filters} />
        </div>

        <div className="lg:col-span-3">
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <BarChart3 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Loading ratings data...</p>
                </div>
              </CardContent>
            </Card>
          ) : ratingsData.length > 0 ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="overview">All Ratings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <Card>
                  <CardHeader>
                    <CardTitle>Rating Summary ({ratingsData.length} sailings)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 p-2 text-left">Ship</th>
                            <th className="border border-gray-300 p-2 text-left">Sailing</th>
                            <th className="border border-gray-300 p-2 text-left">Fleet</th>
                            <th className="border border-gray-300 p-2 text-left">Period</th>
                            {metricsData?.data?.slice(0, 6).map((metric: string) => (
                              <th key={metric} className="border border-gray-300 p-2 text-center text-xs">
                                {metric}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ratingsData.map((row, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="border border-gray-300 p-2 font-medium">
                                {row['Ship Name']}
                              </td>
                              <td className="border border-gray-300 p-2">
                                {row['Sailing Number']}
                              </td>
                              <td className="border border-gray-300 p-2 capitalize">
                                {row['Fleet']}
                              </td>
                              <td className="border border-gray-300 p-2 text-xs">
                                {row['Start']} to {row['End']}
                              </td>
                              {metricsData?.data?.slice(0, 6).map((metric: string) => (
                                <td key={metric} className="border border-gray-300 p-2 text-center">
                                  {row[metric] !== undefined && row[metric] !== null && row[metric] !== '' ? (
                                    <Badge 
                                      className={getRatingColor(row[metric])}
                                      variant="secondary"
                                    >
                                      {typeof row[metric] === 'number' ? row[metric].toFixed(1) : row[metric]}
                                    </Badge>
                                  ) : (
                                    <span className="text-gray-400">N/A</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select filters and apply to view rating data</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default RatingSummary;
