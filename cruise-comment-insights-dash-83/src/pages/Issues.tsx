
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ChevronDown, X, BarChart3 } from 'lucide-react';
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
  const fetchIssues = async () => {    console.log('=== ISSUES FETCH DEBUG START ===');
    console.log('Current filters object:', filters);
    console.log('Selected sheets:', selectedSheets);
    console.log('Sheets data:', sheetsData?.data);
    console.log('Available sheets from API:', sheetsData);
    
    setLoading(true);
    try {      // Payload for the current backend /sailing/getIssuesList endpoint
      const requestData = {
        // Include all filter data for the backend to process
        ships: filters.ships && filters.ships.length > 0 
          ? filters.ships.map((ship: string) => ship.split(':')[1] || ship) // Remove fleet prefix
          : [],
        sailing_numbers: filters.sailingNumbers && filters.sailingNumbers.length > 0 
          ? filters.sailingNumbers 
          : [],
        sheets: selectedSheets.length > 0 
          ? selectedSheets 
          : (sheetsData?.data && sheetsData.data.length > 0 ? sheetsData.data : []),
        // Use start_date, end_date with "-1" for all dates instead of use_all_dates
        start_date: filters.useAllDates ? "-1" : filters.fromDate,
        end_date: filters.useAllDates ? "-1" : filters.toDate,
        fleets: filters.fleets || []
      };      console.log('=== ISSUES PAYLOAD DEBUG ===');
      console.log('Raw filters.ships:', filters.ships);
      console.log('Processed ships:', requestData.ships);
      console.log('Raw filters.sailingNumbers:', filters.sailingNumbers);
      console.log('Processed sailing_numbers:', requestData.sailing_numbers);
      console.log('Selected sheets:', selectedSheets);
      console.log('Processed sheets:', requestData.sheets);
      console.log('Date filters - useAllDates:', filters.useAllDates);
      console.log('Date filters - start_date:', requestData.start_date);
      console.log('Date filters - end_date:', requestData.end_date);
      console.log('Final issues payload:', requestData);
      console.log('=== END PAYLOAD DEBUG ===');
      
      console.log('Sending issues request to /sailing/getIssuesList...');
      const response = await apiService.getIssuesSummary(requestData);      console.log('Issues response received:', response);
      console.log('Issues response status:', response.status);
      console.log('Issues response data:', response.data);
      console.log('Issues response data type:', typeof response.data);
      console.log('Sailing summaries data:', response.data?.sailing_summaries);
      console.log('All issues data:', response.data?.all_issues);
      console.log('Sailing summaries count:', response.data?.sailing_summaries?.length || 0);
      console.log('All issues count:', response.data?.all_issues?.length || 0);
      
      setIssuesData(response.data);
    } catch (error) {
      console.error('Error fetching issues details:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
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
            </div>              {/* Debug info for button state */}
            {process.env.NODE_ENV === 'development' && (
              <div className="p-3 bg-gray-100 rounded text-xs mb-4 space-y-1">
                <p><strong>Debug Info:</strong></p>
                <p>Loading: {loading.toString()}</p>
                <p>UseAllDates: {filters?.useAllDates?.toString()}</p>
                <p>FromDate: {filters?.fromDate || 'undefined'}</p>
                <p>ToDate: {filters?.toDate || 'undefined'}</p>
                <p>Fleets: {JSON.stringify(filters?.fleets)}</p>
                <p>Ships: {JSON.stringify(filters?.ships)}</p>
                <p>SailingNumbers: {JSON.stringify(filters?.sailingNumbers)}</p>
                <p>SelectedSheets: {JSON.stringify(selectedSheets)}</p>
                <p>SheetsLoading: {sheetsLoading.toString()}</p>
                <p>Button disabled: {(loading || sheetsLoading).toString()}</p>
                <p>IssuesData available: {issuesData ? 'yes' : 'no'}</p>
                {issuesData && (
                  <p>IssuesData: {JSON.stringify(issuesData, null, 2)}</p>
                )}
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
      </div>      {/* Results Section */}
      {issuesData ? (
        <div className="space-y-6">
          {/* Sailing Summaries Section - First */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Sailing Summaries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">                {/* Display sailing summaries if available */}
                {issuesData.sailing_summaries && Array.isArray(issuesData.sailing_summaries) ? (
                  <div className="space-y-4">
                    {issuesData.sailing_summaries.map((sailing: any, index: number) => (
                      <div key={index} className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-white">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-bold text-lg text-gray-900 capitalize">
                              {sailing.ship_name || 'Unknown Ship'}
                            </h4>
                            <Badge variant="outline" className="mt-1">
                              {sailing.sailing_number || 'N/A'}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Sailing Summary Text */}
                        <div className="mt-4">
                          <h5 className="font-medium text-gray-800 mb-2">Summary:</h5>
                          <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg">
                            {sailing.sailing_summary || 'No summary available'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-500">
                      <p className="font-medium">Sailing Summary Data</p>
                      <p className="text-sm mt-1">
                        Showing aggregated data for {filters?.ships?.length || 0} ships, 
                        {filters?.sailingNumbers?.length || 0} sailing numbers, 
                        and {selectedSheets.length || 0} issue sheets
                      </p>
                      {/* Display basic filter summary */}
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-blue-800">Ships:</span>
                            <p className="text-blue-600 mt-1">
                              {filters?.ships?.length > 0 
                                ? filters.ships.map((ship: string) => ship.split(':')[1] || ship).join(', ')
                                : 'All Ships'
                              }
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-blue-800">Date Range:</span>
                            <p className="text-blue-600 mt-1">
                              {filters?.useAllDates 
                                ? 'All Dates' 
                                : `${filters?.fromDate || 'N/A'} to ${filters?.toDate || 'N/A'}`
                              }
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-blue-800">Issue Sheets:</span>
                            <p className="text-blue-600 mt-1">
                              {selectedSheets.length > 0 
                                ? `${selectedSheets.length} selected`
                                : 'All Sheets'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>          {/* All Issues Overview Section - Second */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                All Issues Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {issuesData.sailing_summaries ? issuesData.sailing_summaries.length : 0}
                  </div>
                  <p className="text-sm text-gray-600">Sailings Analyzed</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {issuesData.all_issues ? issuesData.all_issues.length : 0}
                  </div>
                  <p className="text-sm text-gray-600">Total Issues Found</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {issuesData.all_issues ? 
                      [...new Set(issuesData.all_issues.map((issue: any) => issue.sheet_name))].length : 0}
                  </div>
                  <p className="text-sm text-gray-600">Issue Categories</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {issuesData.all_issues ? 
                      [...new Set(issuesData.all_issues.map((issue: any) => issue.ship_name))].length : 0}
                  </div>
                  <p className="text-sm text-gray-600">Ships Covered</p>
                </div>
              </div>
            </CardContent>
          </Card>{/* Detailed Issues Analysis - All Issues */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                All Issues - Detailed Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  <strong>Complete Issues Breakdown:</strong> Based on the selected filters, we found {issuesData.total_issues || 0} total issues across your selected criteria.
                  {(issuesData.resolved_issues || 0) > 0 && ` ${issuesData.resolved_issues} have been resolved.`}
                  {(issuesData.unresolved_issues || 0) > 0 && ` ${issuesData.unresolved_issues} require attention.`}
                </p>
                
                {/* Additional details if available */}
                {issuesData.details && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Additional Details:</h4>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {typeof issuesData.details === 'string' 
                        ? issuesData.details 
                        : JSON.stringify(issuesData.details, null, 2)}
                    </pre>
                  </div>
                )}
                  {/* Categories breakdown if available */}
                {issuesData.categories && Array.isArray(issuesData.categories) && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Issue Categories:</h4>
                    <div className="flex flex-wrap gap-2">
                      {issuesData.categories.map((category: string, index: number) => (
                        <Badge key={index} variant="outline">{category}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                  {/* All Issues List - if available */}
                {issuesData.all_issues && Array.isArray(issuesData.all_issues) && issuesData.all_issues.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-4 text-lg">All Issues Details</h4>
                    <div className="space-y-4 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
                      {issuesData.all_issues.map((issue: any, index: number) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg border-l-4 border-red-400">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="font-bold text-gray-900 capitalize">
                                {issue.ship_name || 'Unknown Ship'}
                              </div>
                              <Badge variant="outline" className="mt-1 text-xs">
                                {issue.sailing_number || 'N/A'}
                              </Badge>
                            </div>
                            <div className="flex flex-col gap-1">
                              {issue.sheet_name && (
                                <Badge variant="secondary" className="text-xs">
                                  {issue.sheet_name}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {/* Issue Content */}
                          <div className="mt-3">
                            <h5 className="font-medium text-gray-800 mb-2">Issues Identified:</h5>
                            <div className="text-sm text-gray-700 leading-relaxed bg-white p-3 rounded border max-h-32 overflow-y-auto">
                              {issue.issues || 'No detailed issues available'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Show message if no individual issues available */}
                {(!issuesData.all_issues || !Array.isArray(issuesData.all_issues) || issuesData.all_issues.length === 0) && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <p className="text-blue-700 text-sm">
                      <strong>Note:</strong> Individual issue details are not available in the current response. 
                      The summary above shows aggregated issue counts and statistics.
                    </p>
                  </div>
                )}
                
                {/* Debug data display */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                    <h4 className="font-medium mb-2 text-yellow-800">Debug - Full Response Data:</h4>
                    <pre className="text-xs text-yellow-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {JSON.stringify(issuesData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
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
              <p className="text-sm">Configure your filters and click "Get Issues Summary" to view issues data</p>
              <p className="text-xs mt-2 text-gray-400">
                Select ships, date ranges, and issue sheets to analyze
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Issues;
