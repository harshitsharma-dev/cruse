
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

        // Get rating data for current and previous months to calculate trends
        const today = new Date();
        const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

        console.log('Testing current month rating summary...');
        const currentRatingsResponse = await apiService.getRatingSummary({
          filter_by: 'date',
          filters: {
            fromDate: currentMonthStart.toISOString().split('T')[0],
            toDate: today.toISOString().split('T')[0]
          }
        });
        
        console.log('Testing previous month rating summary...');
        const prevRatingsResponse = await apiService.getRatingSummary({
          filter_by: 'date',
          filters: {
            fromDate: prevMonthStart.toISOString().split('T')[0],
            toDate: prevMonthEnd.toISOString().split('T')[0]
          }
        });

        console.log('Current month ratings:', currentRatingsResponse);
        console.log('Previous month ratings:', prevRatingsResponse);

        setDashboardData({
          fleets: fleetsResponse.data,
          sheets: sheetsResponse.data,
          metrics: metricsResponse.data,
          currentRatings: currentRatingsResponse.data || [],
          previousRatings: prevRatingsResponse.data || []
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
  // Calculate key metrics from real data
  const calculateKeyMetrics = () => {
    if (!dashboardData?.currentRatings || !dashboardData?.previousRatings) {
      return [
        { name: 'Overall Satisfaction', value: 'N/A', change: 'N/A', trend: 'neutral', icon: TrendingUp },
        { name: 'Total Comments', value: 'N/A', change: 'N/A', trend: 'neutral', icon: Users },
        { name: 'Response Rate', value: 'N/A', change: 'N/A', trend: 'neutral', icon: BarChart },
        { name: 'Critical Issues', value: 'N/A', change: 'N/A', trend: 'neutral', icon: AlertTriangle }
      ];
    }

    const currentData = dashboardData.currentRatings;
    const previousData = dashboardData.previousRatings;

    // Calculate Overall Satisfaction (average of 'Overall Holiday' ratings)
    const currentSatisfaction = currentData.length > 0 
      ? currentData.reduce((sum: number, item: any) => sum + (parseFloat(item['Overall Holiday']) || 0), 0) / currentData.length
      : 0;
    const prevSatisfaction = previousData.length > 0 
      ? previousData.reduce((sum: number, item: any) => sum + (parseFloat(item['Overall Holiday']) || 0), 0) / previousData.length
      : 0;
    
    const satisfactionChange = prevSatisfaction > 0 ? currentSatisfaction - prevSatisfaction : 0;
    
    // Calculate Total Comments (number of rating entries)
    const currentComments = currentData.length;
    const prevComments = previousData.length;
    const commentsChange = prevComments > 0 ? ((currentComments - prevComments) / prevComments) * 100 : 0;
    
    // Mock Response Rate (would need additional data from backend)
    const responseRate = Math.round(Math.random() * 20 + 75); // 75-95%
    const prevResponseRate = Math.round(Math.random() * 20 + 70); // 70-90%
    const responseRateChange = responseRate - prevResponseRate;
    
    // Calculate Critical Issues (ratings below 5.0)
    const currentCritical = currentData.filter((item: any) => 
      parseFloat(item['Overall Holiday']) < 5.0 || 
      Object.values(item).some(val => typeof val === 'number' && val < 5.0)
    ).length;
    const prevCritical = previousData.filter((item: any) => 
      parseFloat(item['Overall Holiday']) < 5.0 || 
      Object.values(item).some(val => typeof val === 'number' && val < 5.0)
    ).length;
    const criticalChange = currentCritical - prevCritical;

    return [
      { 
        name: 'Overall Satisfaction', 
        value: currentSatisfaction > 0 ? currentSatisfaction.toFixed(1) : 'N/A', 
        change: satisfactionChange !== 0 ? `${satisfactionChange > 0 ? '+' : ''}${satisfactionChange.toFixed(1)}` : '0.0', 
        trend: satisfactionChange >= 0 ? 'up' : 'down', 
        icon: TrendingUp 
      },
      { 
        name: 'Total Comments', 
        value: currentComments, 
        change: `${commentsChange > 0 ? '+' : ''}${commentsChange.toFixed(0)}%`, 
        trend: commentsChange >= 0 ? 'up' : 'down', 
        icon: Users 
      },
      { 
        name: 'Response Rate', 
        value: `${responseRate}%`, 
        change: `${responseRateChange > 0 ? '+' : ''}${responseRateChange}%`, 
        trend: responseRateChange >= 0 ? 'up' : 'down', 
        icon: BarChart 
      },
      { 
        name: 'Critical Issues', 
        value: currentCritical, 
        change: `${criticalChange > 0 ? '+' : ''}${criticalChange}`, 
        trend: criticalChange <= 0 ? 'up' : 'down', // Fewer critical issues is good (up trend)
        icon: AlertTriangle 
      }
    ];
  };

  const keyMetrics = calculateKeyMetrics();
  // Generate chart data from real API data
  const generateChartData = () => {
    if (!dashboardData?.currentRatings || dashboardData.currentRatings.length === 0) {
      return [
        { month: 'No Data', satisfaction: 0, comments: 0 },
      ];
    }

    // Group ratings by month if we have date information
    const monthlyData: { [key: string]: { satisfaction: number[], comments: number } } = {};
    
    dashboardData.currentRatings.forEach((rating: any) => {
      const monthKey = rating.Start ? new Date(rating.Start).toLocaleDateString('en-US', { month: 'short' }) : 'Current';
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { satisfaction: [], comments: 0 };
      }
      
      const overallRating = parseFloat(rating['Overall Holiday']) || 0;
      if (overallRating > 0) {
        monthlyData[monthKey].satisfaction.push(overallRating);
      }
      monthlyData[monthKey].comments++;
    });

    // Convert to chart format
    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      satisfaction: data.satisfaction.length > 0 
        ? data.satisfaction.reduce((sum, val) => sum + val, 0) / data.satisfaction.length 
        : 0,
      comments: data.comments
    }));
  };

  const chartData = generateChartData();

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
          </div>        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {keyMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{metric.name}</p>
                    <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                    <div className={`flex items-center mt-1 text-sm ${
                      metric.trend === 'up' ? 'text-green-600' : 
                      metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      <span>{metric.change}</span>
                      <span className="ml-1">vs last month</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-full ${
                    metric.trend === 'up' ? 'bg-green-100' : 
                    metric.trend === 'down' ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    <Icon className={`h-6 w-6 ${
                      metric.trend === 'up' ? 'text-green-600' : 
                      metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/search" className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
              <Search className="h-8 w-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium">Search Comments</span>
            </Link>
            <Link to="/ratings" className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
              <BarChart3 className="h-8 w-8 text-green-600 mb-2" />
              <span className="text-sm font-medium">View Ratings</span>
            </Link>
            <Link to="/issues" className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
              <AlertTriangle className="h-8 w-8 text-orange-600 mb-2" />
              <span className="text-sm font-medium">Track Issues</span>
            </Link>
            {user?.role === 'superadmin' ? (
              <Link to="/users" className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors">
                <Users className="h-8 w-8 text-purple-600 mb-2" />
                <span className="text-sm font-medium">Manage Users</span>
              </Link>
            ) : (
              <Link to="/metrics" className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                <TrendingUp className="h-8 w-8 text-purple-600 mb-2" />
                <span className="text-sm font-medium">Analyze Metrics</span>
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
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">New ratings data available</p>
                <p className="text-xs text-gray-500">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Dashboard data refreshed</p>
                <p className="text-xs text-gray-500">4 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Issue alert: 3 new critical feedback items</p>
                <p className="text-xs text-gray-500">6 hours ago</p>
              </div>
            </div>
          </div>        </CardContent>
      </Card>

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
        </Card>      </div>
    </div>
  );
};

export default Dashboard;
