// Lazy loading utilities for UI components to reduce initial bundle size
import { lazy, ComponentType } from 'react';

// Dynamically import heavy UI components only when needed
export const LazyTooltip = lazy(() => 
  import('@radix-ui/react-tooltip').then(module => ({
    default: module.Tooltip
  }))
);

export const LazyDropdownMenu = lazy(() => 
  import('@radix-ui/react-dropdown-menu').then(module => ({
    default: module.DropdownMenu
  }))
);

export const LazyAccordion = lazy(() => 
  import('@radix-ui/react-accordion').then(module => ({
    default: module.Accordion
  }))
);

export const LazyDatePicker = lazy(() => 
  import('react-day-picker').then(module => ({
    default: module.DayPicker
  }))
);

export const LazyCommandMenu = lazy(() => 
  import('cmdk').then(module => ({
    default: module.Command
  }))
);

// Helper function to create lazy components with fallback
export function createLazyComponent<T = any>(
  importFn: () => Promise<{ default: ComponentType<T> }>
) {
  return lazy(importFn);
}

// Preload heavy components on user interaction
export const preloadUIComponents = {
  tooltip: () => import('@radix-ui/react-tooltip'),
  dropdown: () => import('@radix-ui/react-dropdown-menu'),
  accordion: () => import('@radix-ui/react-accordion'),
  datePicker: () => import('react-day-picker'),
  command: () => import('cmdk'),
};

// Preload on hover/focus for better UX
export const usePreloadOnHover = (componentName: keyof typeof preloadUIComponents) => {
  const preload = () => {
    preloadUIComponents[componentName]();
  };

  return {
    onMouseEnter: preload,
    onFocus: preload,
  };
};
