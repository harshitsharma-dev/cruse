import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Shield, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface CookieConsentBannerProps {
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onCustomize: () => void;
}

const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  onAcceptAll,
  onRejectAll,
  onCustomize,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already given consent
    const hasConsent = localStorage.getItem('cookie-consent');
    if (!hasConsent) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('cookie-consent', JSON.stringify({
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    }));
    setIsVisible(false);
    onAcceptAll();
  };

  const handleRejectAll = () => {
    localStorage.setItem('cookie-consent', JSON.stringify({
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    }));
    setIsVisible(false);
    onRejectAll();
  };

  const handleCustomize = () => {
    setIsVisible(false);
    onCustomize();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t shadow-lg">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 mr-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-lg">Privacy & Cookies</h3>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                We use cookies and similar technologies to provide essential functionality, 
                analyze usage, and improve your experience. By continuing to use our service, 
                you consent to our use of cookies as described in our{' '}
                <a href="#" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
              
              <div className="text-xs text-gray-500 mb-4">
                <p><strong>Essential:</strong> Required for basic functionality (always active)</p>
                <p><strong>Analytics:</strong> Help us understand how you use our service</p>
                <p><strong>Marketing:</strong> Enable personalized content and recommendations</p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleAcceptAll} className="bg-blue-600 hover:bg-blue-700">
              Accept All
            </Button>
            <Button onClick={handleRejectAll} variant="outline">
              Reject All
            </Button>
            <Button onClick={handleCustomize} variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Customize
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CookieConsentBanner;
