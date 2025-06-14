
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header with logos */}
        <div className="text-center">
          <div className="flex justify-between items-start mb-8">
            {/* ClientCompany Logo - Top Left */}
            <div className="flex items-center space-x-3">
              <div className="h-14 w-14 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">CC</span>
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-gray-900">
                  <span className="text-blue-600">ClientCompany</span>
                </div>
                <div className="text-sm text-gray-600">
                  Cruise Analytics
                </div>
              </div>
            </div>
            
            {/* Manotr Intelligence Logo - Top Right */}
            <div className="flex items-center space-x-2 text-right">
              <div className="text-sm text-gray-500">
                <div>Powered by</div>
                <div className="font-bold text-gray-800">
                  <span className="text-purple-600">Manotr Intelligence</span>
                </div>
              </div>
              <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">MI</span>
              </div>
            </div>          </div>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Cruise Comment Insights Dashboard
          </h2>
          <p className="text-gray-600 mb-8">
            Transform guest feedback into actionable insights
          </p>
        </div><Card className="mt-8 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Hardcoded Authentication - Use predefined credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Quick Login Options */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-800 mb-3">Quick Login Options:</div>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="flex justify-between p-2 bg-white rounded border">
                  <span><strong>superadmin</strong> (any password)</span>
                  <span className="text-red-600 font-medium">Super Admin</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded border">
                  <span><strong>admin</strong> (any password)</span>
                  <span className="text-blue-600 font-medium">Admin</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded border">
                  <span><strong>user</strong> (any password)</span>
                  <span className="text-green-600 font-medium">User</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded border">
                  <span><strong>demo</strong> (any password)</span>
                  <span className="text-green-600 font-medium">User</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded border">
                  <span><strong>(blank)</strong> or any other</span>
                  <span className="text-blue-600 font-medium">Default Admin</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="superadmin, admin, user, demo, or leave blank"
                  disabled={isLoading}
                  className="h-12"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Any password works"
                  disabled={isLoading}
                  className="h-12"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 text-lg"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button className="text-sm text-blue-600 hover:text-blue-500 hover:underline">
                Reset Password
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Footer with logos */}
        <div className="flex justify-between items-center pt-8 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <div className="h-6 w-6 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">CC</span>
            </div>
            <span>ClientCompany</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>Powered by</span>
            <div className="h-6 w-6 bg-gray-200 rounded flex items-center justify-center">
              <span className="text-gray-600 font-semibold text-xs">MI</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
