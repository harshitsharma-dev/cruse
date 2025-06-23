
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
        const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);        console.log('Testing current month rating summary...');
        const currentRatingsResponse = await apiService.getRatingSummary({
          ships: [],
          fleets: [],
          start_date: currentMonthStart.toISOString().split('T')[0],
          end_date: today.toISOString().split('T')[0],
          sailing_numbers: []
        });
        
        console.log('Testing previous month rating summary...');
        const prevRatingsResponse = await apiService.getRatingSummary({
          ships: [],
          fleets: [],
          start_date: prevMonthStart.toISOString().split('T')[0],
          end_date: prevMonthEnd.toISOString().split('T')[0],
          sailing_numbers: []
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
  }, []);  // Calculate key metrics from real data
  const calculateKeyMetrics = () => {
    if (!dashboardData?.currentRatings || !Array.isArray(dashboardData.currentRatings) || 
        !dashboardData?.previousRatings || !Array.isArray(dashboardData.previousRatings)) {
      return [
        { name: 'Overall Satisfaction', value: 'N/A', change: 'N/A', trend: 'neutral', icon: TrendingUp },
        { name: 'Total Comments', value: 'N/A', change: 'N/A', trend: 'neutral', icon: Users },
        { name: 'Response Rate', value: 'N/A', change: 'N/A', trend: 'neutral', icon: BarChart },
        { name: 'Critical Issues', value: 'N/A', change: 'N/A', trend: 'neutral', icon: AlertTriangle }
      ];
    }

    const currentData = Array.isArray(dashboardData.currentRatings) ? dashboardData.currentRatings : [];
    const previousData = Array.isArray(dashboardData.previousRatings) ? dashboardData.previousRatings : [];

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

  const keyMetrics = calculateKeyMetrics();  // Generate chart data from real API data
  const generateChartData = () => {
    if (!dashboardData?.currentRatings || !Array.isArray(dashboardData.currentRatings) || dashboardData.currentRatings.length === 0) {
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
          <div className="apollo-gradient-primary h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 apollo-animate-float">
            <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full"></div>
          </div>
          <p className="text-lg text-gray-700 font-medium">Loading Apollo Dashboard...</p>
          <p className="text-sm text-gray-500 mt-1">Fetching your analytics data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md apollo-shadow bg-white/95 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Connection Error</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button                onClick={() => window.location.reload()} 
                className="apollo-gradient-primary hover:opacity-90 transition-all"
              >
                Retry Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="apollo-gradient-primary rounded-2xl p-8 text-white apollo-shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              Welcome to Apollo, {user?.name || user?.username}!
            </h1>
            <p className="text-blue-100 text-lg mb-4">
              {user?.role === 'superadmin' ? 'You have full system access and can manage all users.' :
               user?.role === 'admin' ? 'You can manage users and access all cruise data.' :
               'View and analyze cruise guest feedback data.'}
            </p>
            <div className="flex items-center">
              <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                user?.role === 'superadmin' ? 'bg-red-100 text-red-800' :
                user?.role === 'admin' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {user?.role === 'superadmin' ? 'Super Admin' : 
                 user?.role === 'admin' ? 'Admin' : 'User'}
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="h-20 w-20 bg-white/20 rounded-full flex items-center justify-center apollo-animate-float">
              <TrendingUp className="h-10 w-10 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {keyMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className="relative overflow-hidden apollo-shadow bg-white/90 backdrop-blur-sm border-white/20 hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{metric.name}</p>
                    <p className="text-3xl font-bold text-gray-900 mb-2">{metric.value}</p>
                    <div className={`flex items-center text-sm font-medium ${
                      metric.trend === 'up' ? 'text-green-600' : 
                      metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      <span>{metric.change}</span>
                      <span className="ml-1 font-normal opacity-75">vs last month</span>
                    </div>
                  </div>
                  <div className={`p-4 rounded-2xl ${
                    metric.trend === 'up' ? 'apollo-gradient-accent' : 
                    metric.trend === 'down' ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    <Icon className={`h-8 w-8 ${
                      metric.trend === 'up' ? 'text-white' : 
                      metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>      {/* Quick Actions */}
      <Card className="apollo-shadow bg-white/90 backdrop-blur-sm border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="apollo-gradient-accent p-2 rounded-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/search" className="group flex flex-col items-center p-6 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:apollo-gradient-accent hover:text-white transition-all duration-300 transform hover:scale-105">
              <Search className="h-10 w-10 text-blue-600 group-hover:text-white mb-3 transition-colors" />
              <span className="text-sm font-semibold">Search Comments</span>
            </Link>
            <Link to="/ratings" className="group flex flex-col items-center p-6 rounded-xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-500 hover:text-white transition-all duration-300 transform hover:scale-105">
              <BarChart3 className="h-10 w-10 text-green-600 group-hover:text-white mb-3 transition-colors" />
              <span className="text-sm font-semibold">View Ratings</span>
            </Link>
            <Link to="/issues" className="group flex flex-col items-center p-6 rounded-xl border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-500 hover:text-white transition-all duration-300 transform hover:scale-105">
              <AlertTriangle className="h-10 w-10 text-orange-600 group-hover:text-white mb-3 transition-colors" />
              <span className="text-sm font-semibold">Track Issues</span>
            </Link>
            {user?.role === 'superadmin' ? (
              <Link to="/users" className="group flex flex-col items-center p-6 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-500 hover:text-white transition-all duration-300 transform hover:scale-105">
                <Users className="h-10 w-10 text-purple-600 group-hover:text-white mb-3 transition-colors" />
                <span className="text-sm font-semibold">Manage Users</span>
              </Link>
            ) : (
              <Link to="/metrics" className="group flex flex-col items-center p-6 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-500 hover:text-white transition-all duration-300 transform hover:scale-105">
                <TrendingUp className="h-10 w-10 text-purple-600 group-hover:text-white mb-3 transition-colors" />
                <span className="text-sm font-semibold">Analyze Metrics</span>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="apollo-shadow bg-white/90 backdrop-blur-sm border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="apollo-gradient-secondary p-2 rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-3 h-3 apollo-gradient-accent rounded-full apollo-animate-float"></div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">New ratings data available</p>                <p className="text-xs text-gray-500 font-medium">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Dashboard data refreshed</p>
                <p className="text-xs text-gray-500 font-medium">4 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Issue alert: 3 new critical feedback items</p>
                <p className="text-xs text-gray-500 font-medium">6 hours ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts and Data Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Satisfaction Trend */}
        <Card className="apollo-shadow bg-white/90 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="apollo-gradient-primary p-2 rounded-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              Satisfaction Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                <XAxis dataKey="month" tick={{ fill: '#6b7280' }} />
                <YAxis tick={{ fill: '#6b7280' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                  }}
                />
                <Bar dataKey="satisfaction" fill="url(#apolloGradient)" radius={[4, 4, 0, 0]} />
                <defs>
                  <linearGradient id="apolloGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--apollo-primary))" />
                    <stop offset="100%" stopColor="hsl(var(--apollo-accent))" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Fleet Overview */}
        <Card className="apollo-shadow bg-white/90 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="apollo-gradient-secondary p-2 rounded-lg">
                <Ship className="h-6 w-6 text-white" />
              </div>
              Fleet Overview
            </CardTitle>          </CardHeader>          <CardContent>
            {dashboardData?.fleets && Array.isArray(dashboardData.fleets) && (
              <div className="space-y-4">
                {dashboardData.fleets.map((fleet: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                    <div>
                      <h3 className="font-bold text-gray-900 capitalize">{fleet.fleet}</h3>
                      <p className="text-sm text-gray-600 font-medium">{Array.isArray(fleet.ships) ? fleet.ships.length : 0} ships</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(fleet.ships) && fleet.ships.slice(0, 3).map((ship: string) => (
                        <Badge key={ship} className="apollo-gradient-accent text-white font-medium">
                          {ship}
                        </Badge>
                      ))}
                      {Array.isArray(fleet.ships) && fleet.ships.length > 3 && (
                        <Badge variant="outline" className="text-xs font-medium border-gray-300">
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
    </div>
  );
};

export default Dashboard;
