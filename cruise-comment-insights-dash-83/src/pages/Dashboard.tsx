
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Ship, Users, TrendingUp, AlertTriangle, BarChart3, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
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

        console.log('Starting dashboard data fetch...');
        console.log('API Base URL:', 'http://localhost:5000');

        // Test individual endpoints first
        console.log('Testing fleets endpoint...');
        const fleetsResponse = await apiService.getFleets();
        console.log('Fleets response:', fleetsResponse);

        console.log('Testing sheets endpoint...');
        const sheetsResponse = await apiService.getSheets();
        console.log('Sheets response:', sheetsResponse);

        console.log('Testing metrics endpoint...');
        const metricsResponse = await apiService.getMetrics();
        console.log('Metrics response:', metricsResponse);

        // Get some sample rating data for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const today = new Date();

        console.log('Testing rating summary endpoint...');
        const ratingsResponse = await apiService.getRatingSummary({
          filter_by: 'date',
          filters: {
            fromDate: thirtyDaysAgo.toISOString().split('T')[0],
            toDate: today.toISOString().split('T')[0]
          }
        });
        console.log('Ratings response:', ratingsResponse);

        setDashboardData({
          fleets: fleetsResponse.data,
          sheets: sheetsResponse.data,
          metrics: metricsResponse.data,
          recentRatings: ratingsResponse.data
        });
        console.log('Dashboard data set successfully');
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Mock key metrics data
  const mockMetrics = [
    { name: 'Overall Satisfaction', value: 4.2, change: '+0.3', trend: 'up', icon: TrendingUp },
    { name: 'Total Comments', value: 1247, change: '+12%', trend: 'up', icon: Users },
    { name: 'Response Rate', value: '87%', change: '+5%', trend: 'up', icon: BarChart },
    { name: 'Critical Issues', value: 23, change: '-8', trend: 'down', icon: AlertTriangle }
  ];

  // Mock chart data
  const chartData = [
    { month: 'Jan', satisfaction: 4.1, comments: 1100 },
    { month: 'Feb', satisfaction: 4.0, comments: 1200 },
    { month: 'Mar', satisfaction: 4.3, comments: 1350 },
    { month: 'Apr', satisfaction: 4.2, comments: 1247 },
  ];

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

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Welcome, {user?.name || user?.username}!
            </h1>
            <p className="text-blue-100 mt-1">
              {user?.role === 'superadmin' ? 'You have full system access and can manage all users.' :
               user?.role === 'admin' ? 'You can manage users and access all cruise data.' :
               'View and analyze cruise guest feedback data.'}
            </p>
            <div className="flex items-center mt-3">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                user?.role === 'superadmin' ? 'bg-red-100 text-red-800' :
                user?.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                'bg-green-100 text-green-800'
              }`}>
                {user?.role === 'superadmin' ? '🔐 Super Administrator' :
                 user?.role === 'admin' ? '👨‍💼 Administrator' :
                 '👤 User'}
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <Ship className="h-16 w-16 text-blue-200" />
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mockMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{metric.name}</p>
                    <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                    <div className={`flex items-center mt-1 text-sm ${
                      metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <span>{metric.change}</span>
                      <span className="ml-1">vs last month</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-full ${
                    metric.trend === 'up' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <Icon className={`h-6 w-6 ${
                      metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts and Data Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Satisfaction Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Satisfaction Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="satisfaction" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Fleet Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Fleet Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData?.fleets && (
              <div className="space-y-4">
                {dashboardData.fleets.map((fleet: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-semibold capitalize">{fleet.fleet}</h3>
                      <p className="text-sm text-gray-600">{fleet.ships.length} ships</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {fleet.ships.slice(0, 3).map((ship: string) => (
                        <Badge key={ship} variant="secondary" className="text-xs">
                          {ship}
                        </Badge>
                      ))}
                      {fleet.ships.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{fleet.ships.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Role-specific sections */}
      {(user?.role === 'admin' || user?.role === 'superadmin') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Admin Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Link 
                  to="/ratings" 
                  className="flex items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <BarChart3 className="h-5 w-5 text-blue-600 mr-3" />
                  <span className="font-medium">View Rating Summary</span>
                </Link>
                <Link 
                  to="/search" 
                  className="flex items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Search className="h-5 w-5 text-green-600 mr-3" />
                  <span className="font-medium">Search Comments</span>
                </Link>
                {user?.role === 'superadmin' && (
                  <Link 
                    to="/users" 
                    className="flex items-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <Users className="h-5 w-5 text-purple-600 mr-3" />
                    <span className="font-medium">Manage Users</span>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center p-3 border-l-4 border-blue-500 bg-blue-50">
                  <div>
                    <p className="text-sm font-medium">New ratings data available</p>
                    <p className="text-xs text-gray-600">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center p-3 border-l-4 border-green-500 bg-green-50">
                  <div>
                    <p className="text-sm font-medium">Data export completed</p>
                    <p className="text-xs text-gray-600">5 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center p-3 border-l-4 border-yellow-500 bg-yellow-50">
                  <div>
                    <p className="text-sm font-medium">System maintenance scheduled</p>
                    <p className="text-xs text-gray-600">1 day ago</p>
                  </div>
                </div>              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
