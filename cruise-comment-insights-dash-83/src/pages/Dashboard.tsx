
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Ship, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch basic data for dashboard
        const [fleetsResponse, sheetsResponse, metricsResponse] = await Promise.all([
          apiService.getFleets(),
          apiService.getSheets(),
          apiService.getMetrics()
        ]);

        // Get some sample rating data for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const today = new Date();

        const ratingsResponse = await apiService.getRatingSummary({
          filter_by: 'date',
          filters: {
            fromDate: thirtyDaysAgo.toISOString().split('T')[0],
            toDate: today.toISOString().split('T')[0]
          }
        });

        setDashboardData({
          fleets: fleetsResponse.data,
          sheets: sheetsResponse.data,
          metrics: metricsResponse.data,
          recentRatings: ratingsResponse.data
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Connection Error</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalShips = dashboardData?.fleets?.reduce((acc: number, fleet: any) => acc + fleet.ships.length, 0) || 0;
  const totalSailings = dashboardData?.recentRatings?.length || 0;
  const averageRating = dashboardData?.recentRatings?.length > 0 
    ? (dashboardData.recentRatings.reduce((acc: number, rating: any) => acc + (rating['Overall Holiday'] || 0), 0) / dashboardData.recentRatings.length).toFixed(1)
    : 'N/A';

  // Prepare chart data from recent ratings
  const chartData = dashboardData?.recentRatings?.slice(0, 10).map((rating: any) => ({
    name: `${rating['Ship Name']} - ${rating['Sailing Number']}`,
    rating: rating['Overall Holiday'] || 0,
    ship: rating['Ship Name']
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.username}!
        </h1>
        <p className="text-gray-600 mt-2">Here's your sailing analytics overview</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Ship className="h-8 w-8 text-blue-600 mb-2" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Ships</p>
                <p className="text-2xl font-bold text-gray-900">{totalShips}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600 mb-2" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Recent Sailings</p>
                <p className="text-2xl font-bold text-gray-900">{totalSailings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-yellow-600 mb-2" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold text-gray-900">{averageRating}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600 mb-2" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Metrics Tracked</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData?.metrics?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Data */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fleets">Fleet Status</TabsTrigger>
          <TabsTrigger value="ratings">Recent Ratings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sailings Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      fontSize={12}
                    />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Bar dataKey="rating" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No recent sailing data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fleets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardData?.fleets?.map((fleet: any) => (
              <Card key={fleet.fleet}>
                <CardHeader>
                  <CardTitle className="capitalize">{fleet.fleet} Fleet</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Ships: {fleet.ships.length}</p>
                    <div className="flex flex-wrap gap-1">
                      {fleet.ships.map((ship: string) => (
                        <Badge key={ship} variant="secondary" className="text-xs capitalize">
                          {ship}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ratings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sailing Ratings</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData?.recentRatings?.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.recentRatings.slice(0, 10).map((rating: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">{rating['Ship Name']}</h4>
                        <p className="text-sm text-gray-600">Sailing: {rating['Sailing Number']}</p>
                        <p className="text-xs text-gray-500">{rating['Fleet']} fleet</p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={rating['Overall Holiday'] >= 8 ? 'default' : rating['Overall Holiday'] >= 6 ? 'secondary' : 'destructive'}
                        >
                          {rating['Overall Holiday']?.toFixed(1) || 'N/A'}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {rating['Start']} - {rating['End']}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No rating data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
