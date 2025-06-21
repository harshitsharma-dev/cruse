import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, ChevronDown, ChevronUp, X, BarChart3, Expand, Minimize2 } from 'lucide-react';
import { apiService } from '../services/api';
import BasicFilter from '../components/BasicFilter';
import { FormattedText } from '../components/FormattedText';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

const Issues = () => {
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [issuesData, setIssuesData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<any>({
    useAllDates: true // Default to "All Dates" mode
  });
  const [expandedIssues, setExpandedIssues] = useState<Record<string, boolean>>({});
  const [expandedSummaries, setExpandedSummaries] = useState<Record<string, boolean>>({});

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
  };  const handleFilterChange = (newFilters: any) => {
    console.log('=== FILTER CHANGE IN ISSUES ===');
    console.log('New filters received:', newFilters);
    console.log('Previous filters:', filters);
    setFilters(newFilters);
    console.log('Filters updated in Issues component');
  };

  const toggleIssueExpansion = (issueId: string) => {
    setExpandedIssues(prev => ({
      ...prev,
      [issueId]: !prev[issueId]
    }));
  };

  const toggleSummaryExpansion = (summaryId: string) => {
    setExpandedSummaries(prev => ({
      ...prev,
      [summaryId]: !prev[summaryId]
    }));
  };

  const expandAllIssues = () => {
    if (!issuesData?.all_issues) return;
    const allExpanded: Record<string, boolean> = {};
    issuesData.all_issues.forEach((_: any, index: number) => {
      allExpanded[`issue-${index}`] = true;
    });
    setExpandedIssues(allExpanded);
  };

  const collapseAllIssues = () => {
    setExpandedIssues({});
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

  return (    <div className="space-y-6">
      <div className="bg-gradient-to-r from-white/80 to-blue-50/80 backdrop-blur-sm rounded-xl p-6 border border-white/20 apollo-shadow">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg shadow-lg">
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Issues Summary & Analysis
            </h1>
            <p className="text-gray-600 mt-1">Comprehensive analysis and tracking of issues across all sailings</p>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BasicFilter 
          onFilterChange={handleFilterChange}
          showTitle={true}
          compact={false}
        />
          {/* Sheet Selection */}
        <Card className="apollo-shadow bg-white/70 backdrop-blur-sm border-white/20">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <span className="text-lg font-bold text-gray-900">Issues Configuration</span>
                <p className="text-sm text-gray-600 font-normal">Select sheets and parameters for analysis</p>
              </div>
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
                      <div className="p-4 space-y-2 max-h-60 overflow-y-auto apollo-scrollbar">
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
              )}            </div>            <div className="pt-2">
              <Button 
                onClick={fetchIssues} 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                disabled={loading || sheetsLoading}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Analyzing Issues...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Get Issues Summary</span>
                  </div>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>      {/* Results Section */}
      {issuesData ? (
        <div className="space-y-6">
          {/* Sailing Summaries Section - First */}          <Card className="apollo-shadow bg-white/70 backdrop-blur-sm border-white/20">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <span className="text-lg font-bold text-gray-900">Sailing Summaries</span>
                  <p className="text-sm text-gray-600 font-normal">Overview of sailing performance</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">                {/* Display sailing summaries if available */}
                {issuesData?.sailing_summaries && Array.isArray(issuesData.sailing_summaries) && issuesData.sailing_summaries.length > 0 ? (
                  <div className="space-y-6">
                    {issuesData.sailing_summaries.map((sailing: any, index: number) => (
                      <div key={index} className="group relative bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-green-200">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="h-3 w-3 bg-green-500 rounded-full shadow-sm"></div>
                              <h4 className="font-bold text-lg text-gray-900 capitalize">
                                {sailing.ship_name || 'Unknown Ship'}
                              </h4>
                            </div>
                            <Badge variant="outline" className="text-xs font-medium bg-green-50 text-green-700 border-green-200">
                              Sailing: {sailing.sailing_number || 'N/A'}
                            </Badge>
                          </div>
                          
                          {/* Sailing Number Indicator */}
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <BarChart3 className="h-4 w-4 text-blue-500" />
                            <span>Summary #{index + 1}</span>
                          </div>
                        </div>
                          {/* Sailing Summary Text */}
                        <div className="mt-4">
                          <div className="border-l-4 border-green-400 pl-4">
                            <Collapsible 
                              open={expandedSummaries[`summary-${index}`]} 
                              onOpenChange={() => toggleSummaryExpansion(`summary-${index}`)}
                            >
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent"
                                >
                                  <h5 className="font-medium text-gray-800 flex items-center gap-2">
                                    <span className="h-2 w-2 bg-green-400 rounded-full"></span>
                                    Sailing Summary
                                  </h5>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {expandedSummaries[`summary-${index}`] ? 'Click to collapse' : 'Click to expand'}
                                    </Badge>
                                    {expandedSummaries[`summary-${index}`] ? (
                                      <ChevronUp className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 text-green-600" />
                                    )}
                                  </div>
                                </Button>
                              </CollapsibleTrigger>
                              
                              <CollapsibleContent className="mt-3">
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-lg p-4 shadow-sm">
                                  <div className="text-sm text-gray-800 leading-relaxed">
                                    {sailing.sailing_summary ? (
                                      <FormattedText 
                                        text={sailing.sailing_summary} 
                                        className="text-gray-800"
                                      />
                                    ) : (
                                      <p className="text-gray-500 italic">No summary available</p>
                                    )}
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        </div>
                        
                        {/* Hover Effect Indicator */}
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
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
            </CardContent>          </Card>          {/* Detailed Issues Analysis - All Issues */}
          <Card className="apollo-shadow bg-white/70 backdrop-blur-sm border-white/20">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-100">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <span className="text-lg font-bold text-gray-900">All Issues - Detailed Analysis</span>
                  <p className="text-sm text-gray-600 font-normal">Comprehensive breakdown of identified issues</p>
                </div>
              </CardTitle>
            </CardHeader>            <CardContent>
              <div className="space-y-4">
                {/* All Issues List - if available */}
                {issuesData.all_issues && Array.isArray(issuesData.all_issues) && issuesData.all_issues.length > 0 && (                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-lg text-gray-900">Detailed Issue Reports</h4>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={expandAllIssues}
                            className="text-xs hover:bg-blue-50"
                          >
                            <Expand className="h-3 w-3 mr-1" />
                            Expand All
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={collapseAllIssues}
                            className="text-xs hover:bg-gray-50"
                          >
                            <Minimize2 className="h-3 w-3 mr-1" />
                            Collapse All
                          </Button>
                        </div>
                        <Badge variant="secondary" className="text-sm px-3 py-1">
                          {issuesData.all_issues.length} Total Issues
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-6 pr-2">
                      {issuesData.all_issues.map((issue: any, index: number) => (
                        <div key={index} className="group relative bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-blue-200">
                          {/* Issue Header */}
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="h-3 w-3 bg-red-500 rounded-full shadow-sm"></div>
                                <h5 className="font-bold text-lg text-gray-900 capitalize">
                                  {issue.ship_name || 'Unknown Ship'}
                                </h5>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
                                  Sailing: {issue.sailing_number || 'N/A'}
                                </Badge>
                                {issue.sheet_name && (
                                  <Badge variant="secondary" className="text-xs font-medium bg-gray-100 text-gray-700">
                                    {issue.sheet_name}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            {/* Issue Priority Indicator */}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                              <span>Issue #{index + 1}</span>
                            </div>
                          </div>
                            {/* Issue Content */}
                          <div className="space-y-3">
                            <div className="border-l-4 border-red-400 pl-4">
                              <Collapsible 
                                open={expandedIssues[`issue-${index}`]} 
                                onOpenChange={() => toggleIssueExpansion(`issue-${index}`)}
                              >
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent"
                                  >
                                    <h6 className="font-medium text-gray-800 flex items-center gap-2">
                                      <span className="h-2 w-2 bg-red-400 rounded-full"></span>
                                      Issue Details
                                    </h6>
                                    <div className="flex items-center gap-2">
                                      <Badge 
                                        variant="outline" 
                                        className={cn(
                                          "text-xs transition-colors",
                                          expandedIssues[`issue-${index}`] 
                                            ? "bg-red-50 text-red-700 border-red-200" 
                                            : "bg-gray-50 text-gray-600 border-gray-200"
                                        )}
                                      >
                                        {expandedIssues[`issue-${index}`] ? 'Click to collapse' : 'Click to expand'}
                                      </Badge>
                                      {expandedIssues[`issue-${index}`] ? (
                                        <ChevronUp className="h-4 w-4 text-red-600" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4 text-red-600" />
                                      )}
                                    </div>
                                  </Button>
                                </CollapsibleTrigger>
                                
                                <CollapsibleContent className="mt-3">
                                  <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-lg p-4 shadow-sm">
                                    <div className="text-sm text-gray-800 leading-relaxed">
                                      {issue.issues ? (
                                        <FormattedText 
                                          text={issue.issues} 
                                          className="text-gray-800"
                                        />
                                      ) : (
                                        <p className="text-gray-500 italic">No detailed issues available</p>
                                      )}
                                    </div>
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                          </div>
                          
                          {/* Hover Effect Indicator */}
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Issues Summary Footer */}
                    <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-blue-700">
                          <BarChart3 className="h-4 w-4" />
                          <span className="font-medium">Analysis Complete</span>
                        </div>
                        <div className="text-blue-600">
                          {issuesData.all_issues.length} issues analyzed across {
                            (() => {
                              try {
                                const ships = [...new Set(issuesData.all_issues.map((issue: any) => issue?.ship_name).filter(Boolean))];
                                return ships.length;
                              } catch (error) {
                                return 0;
                              }
                            })()
                          } ships
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>      ) : loading ? (
        <Card className="apollo-shadow bg-white/70 backdrop-blur-sm border-white/20">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                <div className="absolute inset-0 rounded-full h-12 w-12 border-4 border-transparent border-r-orange-400 animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-gray-700 mb-1">Loading Issues Data</p>
                <p className="text-sm text-gray-500">Analyzing your selected criteria...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="apollo-shadow bg-white/70 backdrop-blur-sm border-white/20">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="relative inline-block mb-6">
                <AlertTriangle className="h-16 w-16 text-gray-300" />
                <div className="absolute -top-2 -right-2 h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 mb-2">Ready to Analyze Issues</p>
                <p className="text-gray-600 mb-4">Configure your filters and click "Get Issues Summary" to view comprehensive issues data</p>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 max-w-md mx-auto">
                  <p className="text-sm text-blue-700 font-medium mb-2">Getting Started:</p>
                  <ul className="text-xs text-blue-600 space-y-1 text-left">
                    <li>• Select ships and date ranges</li>
                    <li>• Choose issue sheets to analyze</li>
                    <li>• Click "Get Issues Summary"</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Issues;
