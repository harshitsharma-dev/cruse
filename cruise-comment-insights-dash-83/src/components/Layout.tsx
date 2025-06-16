
import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  BarChart3, 
  Search, 
  AlertTriangle, 
  TrendingUp, 
  LogOut, 
  User,
  Home,
  Users,
  Menu,
  ChevronLeft
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Rating Summary', href: '/ratings', icon: BarChart3 },
    { name: 'Metric Filter', href: '/metrics', icon: TrendingUp },
    { name: 'Search', href: '/search', icon: Search },
    { name: 'Issues', href: '/issues', icon: AlertTriangle },
    { name: 'Profile', href: '/profile', icon: User },
    // Only show Users menu for admin/superadmin
    ...(user?.role === 'admin' || user?.role === 'superadmin' ? 
        [{ name: 'Users', href: '/users', icon: Users }] : [])
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">            <div className="flex items-center">
              <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">CC</span>
              </div>
              <div>
                <div className="text-xl font-bold text-blue-600">
                  ClientCompany
                </div>
                <div className="text-xs text-gray-500">
                  Cruise Comment Insights
                </div>
              </div>
            </div>              <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Powered by</span>
                <div className="h-6 w-6 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-gray-600 font-semibold text-xs">MI</span>
                </div>
                <span className="font-bold text-gray-800">Manotr Intelligence</span>
              </div>
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">{user?.name || user?.username}</span>
                <span className={`text-xs px-2 py-1 rounded font-medium ${
                  user?.role === 'superadmin' ? 'bg-red-100 text-red-700' :
                  user?.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {user?.role === 'superadmin' ? 'Super Admin' : 
                   user?.role === 'admin' ? 'Admin' : 'User'}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} flex-shrink-0 transition-all duration-300`}>
            <Card className="p-4 h-fit">
              {/* Sidebar Toggle */}
              <div className="flex justify-end mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-1 h-8 w-8"
                >
                  {sidebarCollapsed ? (
                    <Menu className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <nav className="space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center ${sidebarCollapsed ? 'px-2 py-2 justify-center' : 'px-3 py-2'} rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                      title={sidebarCollapsed ? item.name : ''}
                    >
                      <Icon className={`h-4 w-4 ${!sidebarCollapsed ? 'mr-3' : ''}`} />
                      {!sidebarCollapsed && item.name}
                    </Link>
                  );
                })}
              </nav>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>{/* Footer with Manotr Intelligence logo - Bottom Right */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-end items-center">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>Powered by</span>
              <div className="h-6 w-6 bg-gradient-to-br from-purple-500 to-purple-700 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">MI</span>
              </div>
              <span className="font-semibold text-purple-600">Manotr Intelligence</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
