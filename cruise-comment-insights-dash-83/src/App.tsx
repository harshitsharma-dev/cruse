
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { FilterProvider } from "./contexts/FilterContext";
import Layout from "./components/Layout";
import Login from "./components/Login";
import { Preloader } from "./components/Preloader";
import { PerformanceMonitor } from "./hooks/usePerformanceMonitoring";
import { Suspense, lazy } from "react";

// Lazy load components to reduce initial bundle size
// const Dashboard = lazy(() => import("./pages/Dashboard")); // Dashboard hidden temporarily
const RatingSummary = lazy(() => import("./components/RatingSummary"));
const MetricFilter = lazy(() => import("./pages/MetricFilter"));
const Search = lazy(() => import("./pages/Search"));
const Issues = lazy(() => import("./pages/Issues"));
const UserProfile = lazy(() => import("./components/UserProfile"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading component for better UX during code splitting
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
    <div className="flex flex-col items-center space-y-6 p-8 bg-white rounded-xl shadow-lg">
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
        <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-2 border-blue-300 opacity-20"></div>
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-700 mb-1">Loading...</p>
        <p className="text-sm text-gray-500">Please wait while we prepare your dashboard</p>
      </div>
    </div>
  </div>
);

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};
 
const AppRoutes = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/ratings" />} />
      <Route path="/" element={<Navigate to="/ratings" />} />
      <Route element={
        <ProtectedRoute>
          <FilterProvider>
            <Layout />
          </FilterProvider>
        </ProtectedRoute>
      }>
        {/* Dashboard route temporarily hidden */}
        {/* <Route path="/dashboard" element={
          <Suspense fallback={<LoadingSpinner />}>
            <Dashboard />
          </Suspense>
        } /> */}
        <Route path="/ratings" element={
          <Suspense fallback={<LoadingSpinner />}>
            <RatingSummary />
          </Suspense>
        } />
        <Route path="/metrics" element={
          <Suspense fallback={<LoadingSpinner />}>
            <MetricFilter />
          </Suspense>
        } />
        <Route path="/search" element={
          <Suspense fallback={<LoadingSpinner />}>
            <Search />
          </Suspense>
        } />
        <Route path="/issues" element={
          <Suspense fallback={<LoadingSpinner />}>
            <Issues />
          </Suspense>
        } />
        <Route path="/profile" element={
          <Suspense fallback={<LoadingSpinner />}>
            <UserProfile />
          </Suspense>
        } />
        <Route path="/users" element={
          <Suspense fallback={<LoadingSpinner />}>
            <UserManagement />
          </Suspense>
        } />
      </Route>
      <Route path="*" element={
        <Suspense fallback={<LoadingSpinner />}>
          <NotFound />
        </Suspense>
      } />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <PerformanceMonitor />
        <Preloader />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner />}>
            <AppRoutes />
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
