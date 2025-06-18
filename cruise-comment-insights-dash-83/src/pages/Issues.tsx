
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ChevronDown, X } from 'lucide-react';
import { apiService } from '../services/api';
import BasicFilter from '../components/BasicFilter';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

const Issues = () => {
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [issuesData, setIssuesData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<any>({
    useAllDates: true // Default to "All Dates" mode
  });

  // Fetch available sheets from API
  const { data: sheetsData, isLoading: sheetsLoading, error: sheetsError } = useQuery({
    queryKey: ['sheets'],
    queryFn: () => apiService.getSheets(),
  });
  const handleSheetToggle = (sheet: string) => {
    setSelectedSheets(prev => 
      prev.includes(sheet) 
        ? prev.filter(s => s !== sheet)
        : [...prev, sheet]
    );
  };

  const handleSelectAllSheets = () => {
    const allSheets = sheetsData?.data || [];
    if (selectedSheets.length === allSheets.length) {
      setSelectedSheets([]);
    } else {
      setSelectedSheets(allSheets);
    }
  };
  const handleFilterChange = (newFilters: any) => {
    console.log('=== FILTER CHANGE IN ISSUES ===');
    console.log('New filters received:', newFilters);
    console.log('Previous filters:', filters);
    setFilters(newFilters);
    console.log('Filters updated in Issues component');
  };

  const fetchIssues = async () => {
    console.log('=== ISSUES FETCH DEBUG START ===');
    console.log('Current filters object:', filters);
    console.log('Selected sheets:', selectedSheets);
    console.log('Sheets data:', sheetsData?.data);
    
    setLoading(true);
    try {
      const requestData = {
        // Updated to match new BasicFilter format
        fleets: filters.fleets || [],
        ships: filters.ships ? filters.ships.map((ship: string) => ship.split(':')[1] || ship) : [], // Remove fleet prefix
        start_date: filters.useAllDates ? null : (filters.fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
        end_date: filters.useAllDates ? null : (filters.toDate || new Date().toISOString().split('T')[0]),
        sailing_numbers: filters.sailingNumbers || [],
        sheet_names: selectedSheets.length > 0 ? selectedSheets : sheetsData?.data || []
      };

      console.log('Final issues payload:', requestData);
      console.log('Sending issues request to API...');
      const response = await apiService.getIssuesSummary(requestData);
      console.log('Issues response received:', response);
      setIssuesData(response.data);
    } catch (error) {
      console.error('Error fetching issues details:', error);
      alert('Failed to fetch issues data. Please try again.');
    } finally {
      setLoading(false);
      console.log('=== ISSUES FETCH DEBUG END ===');
    }
  };

  if (sheetsError) {
    console.error('Error loading sheets:', sheetsError);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Issues Summary</h1>
        <p className="text-gray-600 mt-2">Analyze and track issues across sailings</p>      </div>

      {/* Filters Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BasicFilter 
          onFilterChange={handleFilterChange}
          showTitle={true}
          compact={false}
        />
        
        {/* Sheet Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Issues Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">            <div>
              <Label className="text-base font-medium">Select Sheets to Analyze</Label>
              {sheetsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading sheets...</p>
                </div>
              ) : sheetsError ? (
                <div className="text-center py-4 text-red-600">
                  <p>Error loading sheets</p>
                </div>
              ) : (
                <div className="mt-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between text-left font-normal"
                      >
                        <span>
                          {selectedSheets.length === 0 
                            ? "Select sheet names..." 
                            : `${selectedSheets.length} sheet(s) selected`}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
                        <div 
                          className="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer"
                          onClick={handleSelectAllSheets}
                        >
                          <span className="font-medium">
                            {selectedSheets.length === (sheetsData?.data?.length || 0) ? "Deselect All" : "Select All"}
                          </span>
                        </div>
                        {(sheetsData?.data || []).map((sheet: string) => (
                          <div 
                            key={sheet}
                            className={cn(
                              "flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer",
                              selectedSheets.includes(sheet) ? "bg-blue-50" : ""
                            )}
                            onClick={() => handleSheetToggle(sheet)}
                          >
                            <span className="text-sm">{sheet}</span>
                            {selectedSheets.includes(sheet) && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  {/* Selected Sheets Display */}
                  {selectedSheets.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedSheets.map((sheet) => (
                        <Badge key={sheet} variant="default" className="text-xs">
                          {sheet}
                          <X 
                            className="h-3 w-3 ml-1 cursor-pointer" 
                            onClick={() => handleSheetToggle(sheet)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>            
            {/* Debug info for button state */}
            {process.env.NODE_ENV === 'development' && (
              <div className="p-2 bg-gray-100 rounded text-xs mb-4">
                <p>Loading: {loading.toString()}</p>
                <p>UseAllDates: {filters?.useAllDates?.toString()}</p>
                <p>FromDate: {filters?.fromDate || 'undefined'}</p>
                <p>ToDate: {filters?.toDate || 'undefined'}</p>
                <p>Fleets: {JSON.stringify(filters?.fleets)}</p>
                <p>Ships: {JSON.stringify(filters?.ships)}</p>
                <p>SheetsLoading: {sheetsLoading.toString()}</p>
                <p>Button disabled: {(loading || sheetsLoading).toString()}</p>
              </div>
            )}
            
            <Button 
              onClick={fetchIssues} 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading || sheetsLoading}
            >
              {loading ? 'Loading...' : 'Get Issues Summary'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results Section */}
      {issuesData ? (
        <div className="space-y-6">
          {/* Summary Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Issues Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {issuesData.total_issues || 0}
                  </div>
                  <p className="text-sm text-gray-600">Total Issues</p>
                </div>                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {issuesData.resolved_issues || 0}
                  </div>
                  <p className="text-sm text-gray-600">Resolved Issues</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {issuesData.unresolved_issues || 0}
                  </div>
                  <p className="text-sm text-gray-600">Unresolved Issues</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Issues Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Issues Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Based on the selected date range and sheets, we found {issuesData.total_issues || 0} total issues. 
                {(issuesData.resolved_issues || 0) > 0 && ` ${issuesData.resolved_issues} have been resolved.`}
                {(issuesData.unresolved_issues || 0) > 0 && ` ${issuesData.unresolved_issues} require attention.`}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : loading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading issues data...</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No data yet</p>
              <p className="text-sm">Configure filters and click "Get Issues Summary" to view data</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Issues;
