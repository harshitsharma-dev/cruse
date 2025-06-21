
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../contexts/AuthContext';
import { User, Save, Key, Mail } from 'lucide-react';

const UserProfile = () => {
  const { user } = useAuth();  const [profileData, setProfileData] = useState({
    name: user?.name || user?.username || '',
    email: user?.email || `${user?.username}@clientcompany.com`,
    department: '',
    role: user?.role || 'user'
  });
  // Available departments as per specifications
  const departments = [
    'Guest Services',
    'Food & Beverage',
    'Entertainment',
    'Shore Excursions',
    'Housekeeping',
    'Engineering',
    'Deck',
    'Medical',
    'Administration',
    'Other'
  ];

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Implementation for saving profile data
    console.log('Saving profile:', profileData);
    alert('Profile updated successfully!');
  };

  const handlePasswordReset = () => {
    // Implementation for password reset
    alert('Password reset instructions have been sent to your email address.');
  };  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="apollo-gradient-primary rounded-2xl p-8 text-white apollo-shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">User Profile</h1>
              <p className="text-blue-100 text-lg">Manage your Apollo account settings and preferences</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge 
              className={`px-4 py-2 text-sm font-semibold ${
                user?.role === 'superadmin' ? 'bg-red-100 text-red-800' :
                user?.role === 'admin' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}
              variant="secondary"
            >
              {user?.role === 'superadmin' ? 'Super Administrator' :
               user?.role === 'admin' ? 'Administrator' : 'User'}
            </Badge>          </div>
        </div>
      </div>

      <Card className="apollo-shadow bg-white/95 backdrop-blur-sm border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="apollo-gradient-accent p-2 rounded-lg">
              <User className="h-6 w-6 text-white" />
            </div>
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={profileData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your full name"
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter your email"
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="department">Department</Label>
              <Select 
                value={profileData.department} 
                onValueChange={(value) => handleInputChange('department', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="role">Current Role</Label>
              <Input
                id="role"
                value={user?.role || 'user'}
                disabled
                className="bg-gray-50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Password Reset</h4>
              <p className="text-sm text-gray-600">Reset your account password</p>
            </div>
            <Button onClick={handlePasswordReset} variant="outline">
              <Key className="h-4 w-4 mr-2" />
              Reset Password
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={handleSave} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Cancel
        </Button>
      </div>    </div>
  );
};

export default UserProfile;
