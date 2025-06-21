
import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ApolloLogo from './ApolloLogo';
import DTCLogo from './DTCLogo';
import { 
  BarChart3, 
  Search, 
  AlertTriangle, 
  TrendingUp, 
  LogOut, 
  User,
  Home,
  Users,
  UserCheck,
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
  };  const navigation = [
    // Dashboard temporarily hidden
    // { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Rating Summary', href: '/ratings', icon: BarChart3 },
    { name: 'Metric Filter', href: '/metrics', icon: TrendingUp },
    { name: 'Search', href: '/search', icon: Search },
    { name: 'Issues', href: '/issues', icon: AlertTriangle },
    { name: 'Personnel', href: '/personnel', icon: UserCheck },
    { name: 'Profile', href: '/profile', icon: User },
    // Only show Users menu for admin/superadmin
    ...(user?.role === 'admin' || user?.role === 'superadmin' ? 
        [{ name: 'Users', href: '/users', icon: Users }] : [])
  ];
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Top Navigation */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Apollo Logo */}
            <div className="flex items-center">
              <ApolloLogo size="sm" />
            </div>            {/* User Info and Actions */}
            <div className="flex items-center space-x-6">
              {/* User Profile */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 apollo-gradient-accent rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">{user?.name || user?.username}</div>
                    <div className={`text-xs font-medium ${
                      user?.role === 'superadmin' ? 'text-red-600' :
                      user?.role === 'admin' ? 'text-blue-600' :
                      'text-green-600'
                    }`}>
                      {user?.role === 'superadmin' ? 'Super Admin' : 
                       user?.role === 'admin' ? 'Admin' : 'User'}
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout}
                  className="border-gray-200 hover:bg-gray-50 transition-all duration-200"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className={`${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'} flex-shrink-0 transition-all duration-300 w-full lg:w-auto`}>
            <Card className="p-4 h-fit bg-white/70 backdrop-blur-sm border-white/20 apollo-shadow">
              {/* Sidebar Toggle */}
              <div className="flex justify-end mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-1 h-8 w-8 hover:bg-gray-100 transition-colors"
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
                      className={`flex items-center ${sidebarCollapsed ? 'px-2 py-3 justify-center' : 'px-4 py-3'} rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'apollo-gradient-primary text-white shadow-lg transform scale-105'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:shadow-md'
                      }`}
                      title={sidebarCollapsed ? item.name : ''}
                    >
                      <Icon className={`h-5 w-5 ${!sidebarCollapsed ? 'mr-3' : ''}`} />
                      {!sidebarCollapsed && (
                        <span className="font-medium">{item.name}</span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </Card>
          </aside>          {/* Main Content */}
          <main className="flex-1 min-w-0 w-full">
            <Outlet />
          </main>
        </div>
      </div>      {/* Footer with DTC logo - Bottom Right */}
      <footer className="bg-white/60 backdrop-blur-sm border-t border-white/20 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-end items-center">
            <div className="flex items-center space-x-3 text-sm text-gray-500">
              <span>Powered by</span>
              <DTCLogo size="md" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
