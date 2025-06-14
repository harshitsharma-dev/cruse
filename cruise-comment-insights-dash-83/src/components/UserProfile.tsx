
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
  const { user } = useAuth();
  const [profileData, setProfileData] = useState({
    name: user?.name || user?.username || '',
    email: user?.email || `${user?.username}@clientcompany.com`,
    department: '',
    fleet: '',
    ship: '',
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

  // Mock fleet/ship data - in real implementation, this would come from API
  const fleetShipData = {
    'marella': ['Discovery', 'Explorer', 'Discovery2', 'Explorer2', 'Voyager'],
    'celebrity': ['Eclipse', 'Equinox', 'Reflection', 'Silhouette'],
    'royal': ['Harmony', 'Symphony', 'Wonder', 'Navigator']
  };

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
  };
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
            <p className="text-gray-600">Manage your account settings and preferences</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            className={`${
              user?.role === 'superadmin' ? 'bg-red-100 text-red-700' :
              user?.role === 'admin' ? 'bg-blue-100 text-blue-700' :
              'bg-green-100 text-green-700'
            }`}
            variant="secondary"
          >
            {user?.role === 'superadmin' ? 'Super Administrator' :
             user?.role === 'admin' ? 'Administrator' : 'User'}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
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

          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-4">Data Access Permissions (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fleet">Fleet Access</Label>                <Select 
                  value={profileData.fleet} 
                  onValueChange={(value) => handleInputChange('fleet', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fleet (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-fleets">All Fleets</SelectItem>
                    {Object.keys(fleetShipData).map((fleet) => (
                      <SelectItem key={fleet} value={fleet} className="capitalize">
                        {fleet}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="ship">Ship Access</Label>                <Select 
                  value={profileData.ship} 
                  onValueChange={(value) => handleInputChange('ship', value)}
                  disabled={!profileData.fleet}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ship (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-ships">All Ships</SelectItem>
                    {profileData.fleet && fleetShipData[profileData.fleet as keyof typeof fleetShipData]?.map((ship) => (
                      <SelectItem key={ship} value={ship}>{ship}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
