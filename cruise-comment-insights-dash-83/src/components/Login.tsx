
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import ApolloLogo from './ApolloLogo';
import DTCLogo from './DTCLogo';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // BYPASS: Comment out real authentication for development
    // const success = await login(username, password);
    
    // BYPASS: Always return success for any username/password
    const success = await login(username || 'demo', password || 'demo');
    
    if (success) {
      navigate('/dashboard');
    } else {
      setError('Invalid credentials. Please try again.');
    }
    
    setIsLoading(false);
  };  return (
    <div className="min-h-screen flex items-center justify-center apollo-gradient-hero py-12 px-4 sm:px-6 lg:px-8">
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header with Apollo Logo */}
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <ApolloLogo size="xl" />
          </div>
          
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-white mb-4">
              Welcome to Apollo
            </h2>
            <p className="text-white/80 text-lg">
              Your intelligent cruise analytics platform
            </p>
            <p className="text-white/60 text-sm mt-2">
              Transform guest feedback into actionable insights
            </p>
          </div>
        </div>        <Card className="mt-8 apollo-shadow-lg bg-white/95 backdrop-blur-md border-white/20">
          <CardHeader className="pb-6">
            <CardTitle className="text-center text-2xl font-bold text-gray-900">Sign In</CardTitle>
            <CardDescription className="text-center text-gray-600">
              Demo Authentication - Choose your role below
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Quick Login Options */}
            <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="text-sm font-semibold text-blue-900 mb-4 text-center">Quick Login Options</div>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-blue-200 hover:shadow-md transition-all">
                  <span className="font-medium"><strong>superadmin</strong> (any password)</span>
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">Super Admin</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-blue-200 hover:shadow-md transition-all">
                  <span className="font-medium"><strong>admin</strong> (any password)</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">Admin</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-blue-200 hover:shadow-md transition-all">
                  <span className="font-medium"><strong>user</strong> (any password)</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">User</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-blue-200 hover:shadow-md transition-all">
                  <span className="font-medium"><strong>demo</strong> (any password)</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">User</span>
                </div>
              </div>
            </div>            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="username" className="text-gray-700 font-medium">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="superadmin, admin, user, demo, or leave blank"
                  disabled={isLoading}
                  className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                />
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Any password works"
                  disabled={isLoading}
                  className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-semibold apollo-gradient-primary hover:opacity-90 transition-all duration-200 rounded-lg"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In to Apollo'}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <button className="text-sm text-blue-600 hover:text-blue-500 hover:underline font-medium">
                Need help signing in?
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Footer with DTC branding */}
        <div className="flex justify-center items-center pt-8">
          <div className="flex items-center space-x-3 text-white/70">
            <span className="text-sm">Powered by</span>
            <DTCLogo size="sm" className="text-white" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
