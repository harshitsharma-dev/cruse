import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Download, Trash2, Settings, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ConsentPreferences {
  analytics: boolean;
  marketing: boolean;
  essential: boolean;
}

const GDPRCompliance: React.FC = () => {
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [consentPreferences, setConsentPreferences] = useState<ConsentPreferences>({
    analytics: false,
    marketing: false,
    essential: true, // Always required
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleConsentUpdate = async () => {
    setLoading(true);
    try {
      // Update consent preferences
      const response = await fetch('/sailing/gdpr/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: localStorage.getItem('username'),
          consent_preferences: consentPreferences,
        }),
      });

      if (response.ok) {
        setMessage('Consent preferences updated successfully');
      } else {
        setMessage('Failed to update consent preferences');
      }
    } catch (error) {
      setMessage('Error updating consent preferences');
    }
    setLoading(false);
  };

  const handleDataExport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/sailing/gdpr/user-data?username=${localStorage.getItem('username')}`);
      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        setMessage('Data export downloaded successfully');
      } else {
        setMessage('Failed to export data');
      }
    } catch (error) {
      setMessage('Error exporting data');
    }
    setLoading(false);
  };

  const handleDataDeletion = async () => {
    if (!confirm('Are you sure you want to delete all your data? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/sailing/gdpr/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: localStorage.getItem('username'),
          confirm_deletion: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(`Data deletion request submitted. Deletion ID: ${data.deletion_id}`);
      } else {
        setMessage('Failed to submit deletion request');
      }
    } catch (error) {
      setMessage('Error submitting deletion request');
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6 text-blue-600" />
        <h1 className="text-3xl font-bold">Privacy & Data Protection</h1>
      </div>

      {message && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Privacy Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Privacy Policy
          </CardTitle>
          <CardDescription>
            Information about how we collect, use, and protect your data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            onClick={() => setShowPrivacyPolicy(!showPrivacyPolicy)}
          >
            {showPrivacyPolicy ? 'Hide' : 'Show'} Privacy Policy
          </Button>
          
          {showPrivacyPolicy && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm space-y-3">
              <div>
                <h4 className="font-semibold">Data We Collect:</h4>
                <ul className="list-disc list-inside ml-4">
                  <li>Authentication credentials (username, hashed password)</li>
                  <li>Cruise review data and ratings for analysis</li>
                  <li>Search queries and filters</li>
                  <li>Session information and IP addresses for security</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold">How We Use Your Data:</h4>
                <ul className="list-disc list-inside ml-4">
                  <li>User authentication and authorization</li>
                  <li>Cruise data analysis and reporting</li>
                  <li>Service improvement and analytics</li>
                  <li>Security monitoring and fraud prevention</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold">Your Rights:</h4>
                <ul className="list-disc list-inside ml-4">
                  <li>Right to access your personal data</li>
                  <li>Right to rectification of inaccurate data</li>
                  <li>Right to erasure (right to be forgotten)</li>
                  <li>Right to restrict processing</li>
                  <li>Right to data portability</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Consent Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Consent Preferences
          </CardTitle>
          <CardDescription>
            Manage your data processing consent preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="essential" 
              checked={consentPreferences.essential}
              disabled={true} // Essential cookies cannot be disabled
            />
            <label htmlFor="essential" className="text-sm">
              <span className="font-medium">Essential</span> - Required for basic functionality (cannot be disabled)
            </label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="analytics" 
              checked={consentPreferences.analytics}
              onCheckedChange={(checked) => 
                setConsentPreferences(prev => ({ ...prev, analytics: checked as boolean }))
              }
            />
            <label htmlFor="analytics" className="text-sm">
              <span className="font-medium">Analytics</span> - Help us improve our service through usage analytics
            </label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="marketing" 
              checked={consentPreferences.marketing}
              onCheckedChange={(checked) => 
                setConsentPreferences(prev => ({ ...prev, marketing: checked as boolean }))
              }
            />
            <label htmlFor="marketing" className="text-sm">
              <span className="font-medium">Marketing</span> - Receive personalized recommendations and updates
            </label>
          </div>
          
          <Button onClick={handleConsentUpdate} disabled={loading}>
            Update Preferences
          </Button>
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Your Data
          </CardTitle>
          <CardDescription>
            Download a copy of all your personal data (Right to Access)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDataExport} disabled={loading} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <p className="text-sm text-gray-600 mt-2">
            This will download a JSON file containing all your personal data we have stored.
          </p>
        </CardContent>
      </Card>

      {/* Data Deletion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Delete Your Data
          </CardTitle>
          <CardDescription>
            Request deletion of all your personal data (Right to be Forgotten)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleDataDeletion} 
            disabled={loading} 
            variant="destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Request Data Deletion
          </Button>
          <p className="text-sm text-gray-600 mt-2">
            <strong>Warning:</strong> This action will permanently delete your account and all associated data. 
            This process may take up to 30 days to complete.
          </p>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact & Support</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            For privacy-related questions or to exercise your rights, contact us at:{' '}
            <a href="mailto:privacy@apollointelligence.com" className="text-blue-600 hover:underline">
              privacy@apollointelligence.com
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default GDPRCompliance;
