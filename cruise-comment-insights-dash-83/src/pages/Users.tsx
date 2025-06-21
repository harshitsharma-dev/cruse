import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { 
  Users as UsersIcon, 
  UserPlus, 
  Key, 
  AlertCircle, 
  CheckCircle,
  Trash2,
  Shield,
  ShieldCheck,
  Crown
} from 'lucide-react';

interface User {
  username: string;
  role: string;
}

const Users = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add User State
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'user'
  });

  // Reset Password State
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState({
    username: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await apiService.listUsers();
      setUsers(response.data);
    } catch (error: any) {
      setError(error.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    setError('');
    setSuccess('');

    // Validate fields
    if (!newUserData.username || !newUserData.password || !newUserData.confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (newUserData.password !== newUserData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newUserData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setLoading(true);
      await apiService.addUser({
        username: newUserData.username,
        password: newUserData.password,
        role: newUserData.role
      });

      setSuccess(`User '${newUserData.username}' added successfully!`);
      setNewUserData({
        username: '',
        password: '',
        confirmPassword: '',
        role: 'user'
      });
      setIsAddUserDialogOpen(false);
      loadUsers(); // Reload users list
    } catch (error: any) {
      setError(error.message || 'Failed to add user');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setSuccess('');

    // Validate fields
    if (!resetPasswordData.username || !resetPasswordData.newPassword || !resetPasswordData.confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (resetPasswordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setLoading(true);
      await apiService.resetUserPassword({
        username: resetPasswordData.username,
        new_password: resetPasswordData.newPassword
      });

      setSuccess(`Password reset successfully for '${resetPasswordData.username}'!`);
      setResetPasswordData({
        username: '',
        newPassword: '',
        confirmPassword: ''
      });
      setIsResetPasswordDialogOpen(false);
    } catch (error: any) {
      setError(error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superadmin':
        return <Crown className="h-4 w-4 text-red-600" />;
      case 'admin':
        return <ShieldCheck className="h-4 w-4 text-yellow-600" />;
      default:
        return <Shield className="h-4 w-4 text-green-600" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'admin':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  // Check if current user has admin privileges
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="apollo-shadow bg-white/95 backdrop-blur-sm border-white/20">
          <CardContent className="py-16">
            <div className="text-center">
              <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600">You need administrator privileges to access user management.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-white/80 to-purple-50/80 backdrop-blur-sm rounded-xl p-6 border border-white/20 apollo-shadow">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg shadow-lg">
            <UsersIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              User Management
            </h1>
            <p className="text-gray-600 mt-1">Manage system users, roles, and permissions</p>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-700">{success}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSuccess('')}
                className="ml-auto h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-700">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError('')}
                className="ml-auto h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">Current Users</TabsTrigger>
          <TabsTrigger value="management">User Management</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="apollo-shadow bg-white/70 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UsersIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <span className="text-lg font-bold text-gray-900">System Users</span>
                  <p className="text-sm text-gray-600 font-normal">Overview of all system users</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading users...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">Total Users: {users.length}</p>
                    <Button onClick={loadUsers} variant="outline" size="sm">
                      Refresh
                    </Button>
                  </div>

                  <div className="grid gap-4">
                    {users.map((userItem, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          {getRoleIcon(userItem.role)}
                          <div>
                            <h3 className="font-medium text-gray-900">{userItem.username}</h3>
                            <p className="text-sm text-gray-500">Username</p>
                          </div>
                        </div>
                        <Badge className={getRoleBadgeColor(userItem.role)}>
                          {userItem.role === 'superadmin' ? 'Super Admin' :
                           userItem.role === 'admin' ? 'Administrator' : 'User'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="management">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Add User Card */}
            <Card className="apollo-shadow bg-white/70 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <UserPlus className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <span className="text-lg font-bold text-gray-900">Add New User</span>
                    <p className="text-sm text-gray-600 font-normal">Create a new system user</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add New User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New User</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={newUserData.username}
                          onChange={(e) => setNewUserData(prev => ({ ...prev, username: e.target.value }))}
                          placeholder="Enter username"
                        />
                      </div>

                      <div>
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={newUserData.password}
                          onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Enter password (min 8 characters)"
                        />
                      </div>

                      <div>
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={newUserData.confirmPassword}
                          onChange={(e) => setNewUserData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          placeholder="Confirm password"
                        />
                      </div>

                      <div>
                        <Label htmlFor="role">Role</Label>
                        <Select value={newUserData.role} onValueChange={(value) => setNewUserData(prev => ({ ...prev, role: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Administrator</SelectItem>
                            {user?.role === 'superadmin' && (
                              <SelectItem value="superadmin">Super Administrator</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button
                          onClick={handleAddUser}
                          disabled={loading}
                          className="flex-1"
                        >
                          {loading ? 'Adding...' : 'Add User'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsAddUserDialogOpen(false);
                            setNewUserData({
                              username: '',
                              password: '',
                              confirmPassword: '',
                              role: 'user'
                            });
                          }}
                          disabled={loading}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Reset Password Card */}
            <Card className="apollo-shadow bg-white/70 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Key className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <span className="text-lg font-bold text-gray-900">Reset Password</span>
                    <p className="text-sm text-gray-600 font-normal">Reset password for any user</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Key className="h-4 w-4 mr-2" />
                      Reset User Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Reset User Password</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="resetUsername">Username</Label>
                        <Select value={resetPasswordData.username} onValueChange={(value) => setResetPasswordData(prev => ({ ...prev, username: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select user" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map((userItem) => (
                              <SelectItem key={userItem.username} value={userItem.username}>
                                {userItem.username} ({userItem.role})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={resetPasswordData.newPassword}
                          onChange={(e) => setResetPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                          placeholder="Enter new password (min 8 characters)"
                        />
                      </div>

                      <div>
                        <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                        <Input
                          id="confirmNewPassword"
                          type="password"
                          value={resetPasswordData.confirmPassword}
                          onChange={(e) => setResetPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          placeholder="Confirm new password"
                        />
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button
                          onClick={handleResetPassword}
                          disabled={loading}
                          className="flex-1"
                        >
                          {loading ? 'Resetting...' : 'Reset Password'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsResetPasswordDialogOpen(false);
                            setResetPasswordData({
                              username: '',
                              newPassword: '',
                              confirmPassword: ''
                            });
                          }}
                          disabled={loading}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Users;
