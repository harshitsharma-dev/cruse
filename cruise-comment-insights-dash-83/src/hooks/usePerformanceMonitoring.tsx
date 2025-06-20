import { useEffect } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint?: number;
}

export const usePerformanceMonitoring = () => {
  useEffect(() => {
    // Only run in production and when performance API is available
    if (import.meta.env.DEV || !window.performance) return;

    const logPerformanceMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      const metrics: PerformanceMetrics = {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstPaint: paint.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
      };

      // Log Largest Contentful Paint if available
      if ('LargestContentfulPaint' in window) {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          metrics.largestContentfulPaint = lastEntry.startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });
      }

      // Log metrics for debugging
      console.log('Performance Metrics:', metrics);
      
      // Send to analytics if needed
      // sendToAnalytics(metrics);
    };

    // Wait for page to fully load
    if (document.readyState === 'complete') {
      setTimeout(logPerformanceMetrics, 100);
    } else {
      window.addEventListener('load', () => {
        setTimeout(logPerformanceMetrics, 100);
      });
    }
  }, []);
};

export const PerformanceMonitor = () => {
  usePerformanceMonitoring();
  return null;
};
