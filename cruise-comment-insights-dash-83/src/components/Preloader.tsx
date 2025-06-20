import { useEffect } from 'react';

export const Preloader = () => {
  useEffect(() => {
    // Preload critical assets
    const preloadLinks = [
      // Add any critical CSS or font files here
      // For example: '/assets/fonts/inter-variable.woff2'
    ];

    preloadLinks.forEach(href => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = href.endsWith('.woff2') || href.endsWith('.woff') ? 'font' : 'style';
      if (link.as === 'font') {
        link.crossOrigin = 'anonymous';
      }
      document.head.appendChild(link);
    });

    // Preconnect to API endpoint
    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = 'http://ag.api.deepthoughtconsultech.com:5000';
    document.head.appendChild(preconnect);

    // Clean up on unmount
    return () => {
      preloadLinks.forEach(href => {
        const link = document.querySelector(`link[href="${href}"]`);
        if (link) {
          document.head.removeChild(link);
        }
      });
    };
  }, []);

  return null;
};
