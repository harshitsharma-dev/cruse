
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { FilterProvider } from "./contexts/FilterContext";
import Layout from "./components/Layout";
import Login from "./components/Login";
import { Suspense, lazy } from "react";

// Lazy load components to reduce initial bundle size
const Dashboard = lazy(() => import("./pages/Dashboard"));
const RatingSummary = lazy(() => import("./components/RatingSummary"));
const MetricFilter = lazy(() => import("./pages/MetricFilter"));
const Search = lazy(() => import("./pages/Search"));
const Issues = lazy(() => import("./pages/Issues"));
const UserProfile = lazy(() => import("./components/UserProfile"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading component for better UX during code splitting
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
      <p className="text-gray-600">Loading...</p>
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
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/ratings" element={<RatingSummary />} />
        <Route path="/metrics" element={<MetricFilter />} />        <Route path="/search" element={<Search />} />
        <Route path="/issues" element={<Issues />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/users" element={<UserManagement />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <FilterProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </FilterProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
