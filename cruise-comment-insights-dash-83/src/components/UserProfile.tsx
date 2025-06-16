
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '../contexts/AuthContext';
import { User, Save } from 'lucide-react';

const UserProfile = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState({
    name: user?.username || '',
    email: '',
    department: '',
    fleet: '',
    ship: '',
    role: user?.role || 'user'
  });

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
    alert('Password reset email sent!');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <User className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={profileData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="department">Department</Label>
              <Select 
                value={profileData.department} 
                onValueChange={(value) => handleInputChange('department', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="guest-services">Guest Services</SelectItem>
                  <SelectItem value="food-beverage">Food & Beverage</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="housekeeping">Housekeeping</SelectItem>
                  <SelectItem value="excursions">Excursions</SelectItem>
                  <SelectItem value="management">Management</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={profileData.role}
                disabled
                className="bg-gray-100"
              />
            </div>
            
            <div>
              <Label htmlFor="fleet">Fleet (Optional)</Label>
              <Select 
                value={profileData.fleet} 
                onValueChange={(value) => handleInputChange('fleet', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fleet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marella">Marella</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="ship">Ship (Optional)</Label>
              <Select 
                value={profileData.ship} 
                onValueChange={(value) => handleInputChange('ship', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discovery">Discovery</SelectItem>
                  <SelectItem value="explorer">Explorer</SelectItem>
                  <SelectItem value="voyager">Voyager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex gap-4 pt-4">
            <Button onClick={handleSave} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
            <Button variant="outline" onClick={handlePasswordReset}>
              Reset Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfile;
