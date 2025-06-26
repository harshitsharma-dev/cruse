import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Users, ChevronDown, ChevronUp, Download, Loader2, Settings, Expand, Minimize2, Check, X, BarChart3, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiService } from '../services/api';
import { useQuery } from '@tanstack/react-query';
import BasicFilter from '../components/BasicFilter';
import { FormattedText } from '../components/FormattedText';

import { BasicFilterState, createIssuesApiData, debugFilters } from '../utils/filterUtils';
import { sortData, toggleSort, SortConfig } from '../utils/sortingUtils';

const Personnel = () => {
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [personnelData, setPersonnelData] = useState<any>(null);
  const [loading, setLoading] = useState(false);  const [filters, setFilters] = useState<BasicFilterState>({
    fleets: [],
    ships: [],
    dateRange: { startDate: '', endDate: '' },
    sailingNumbers: [],
    useAllDates: false // Default to specific date range
  });
  const [expandedPersonnel, setExpandedPersonnel] = useState<Record<string, boolean>>({});
  const [expandedSummaries, setExpandedSummaries] = useState<Record<string, boolean>>({});
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

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
  const handleFilterChange = (newFilters: BasicFilterState) => {
    debugFilters('FILTER CHANGE IN PERSONNEL', newFilters);
    setFilters(newFilters);
    console.log('Filters updated in Personnel component');
  };

  const togglePersonnelExpansion = (personnelId: string) => {
    setExpandedPersonnel(prev => ({
      ...prev,
      [personnelId]: !prev[personnelId]
    }));
  };

  const toggleSummaryExpansion = (summaryId: string) => {
    setExpandedSummaries(prev => ({
      ...prev,
      [summaryId]: !prev[summaryId]
    }));
  };

  const expandAllPersonnel = () => {
    if (!personnelData?.all_personnel) return;
    const allExpanded: Record<string, boolean> = {};
    personnelData.all_personnel.forEach((_: any, index: number) => {
      allExpanded[`personnel-${index}`] = true;
    });
    setExpandedPersonnel(allExpanded);
  };

  const collapseAllPersonnel = () => {
    setExpandedPersonnel({});
  };

  const fetchPersonnel = async () => {
    console.log('=== PERSONNEL FETCH DEBUG START ===');
    console.log('Current filters object:', filters);
    console.log('Selected sheets:', selectedSheets);
    console.log('Sheets data:', sheetsData?.data);
    console.log('Available sheets from API:', sheetsData);
    
    setLoading(true);
    try {
      // Payload for the future personnel endpoint
      const requestData = {
        ships: filters.ships && filters.ships.length > 0 
          ? filters.ships.map((ship: string) => ship.split(':')[1] || ship)
          : [],
        sailing_numbers: filters.sailingNumbers && filters.sailingNumbers.length > 0 
          ? filters.sailingNumbers 
          : [],
        sheets: selectedSheets.length > 0 
          ? selectedSheets 
          : (sheetsData?.data && sheetsData.data.length > 0 ? sheetsData.data : []),        start_date: filters.useAllDates ? "-1" : filters.dateRange?.startDate || "",
        end_date: filters.useAllDates ? "-1" : filters.dateRange?.endDate || "",
        fleets: filters.fleets || []
      };

      console.log('=== PERSONNEL PAYLOAD DEBUG ===');
      console.log('Final personnel payload:', requestData);
      console.log('=== END PAYLOAD DEBUG ===');
      
      // TODO: Replace with actual personnel API call when backend is ready
      // const response = await apiService.getPersonnelMentions(requestData);
      
      // Mock response for now
      const mockResponse = {
        status: "success",
        data: {
          sailing_summaries: [
            {
              ship_name: "explorer",
              sailing_number: "MEX-10-17Jan-AtlanticIslands",
              start_date: "2024-01-17",
              end_date: "2024-01-24",
              personnel_count: 12,
              sailing_summary: "Personnel feedback for Explorer sailing MEX-10-17Jan-AtlanticIslands: 12 personnel mentions identified across multiple departments including housekeeping, dining, and entertainment staff."
            },
            {
              ship_name: "explorer", 
              sailing_number: "MEX-11-17April-CanarianFlavours",
              start_date: "2024-04-17",
              end_date: "2024-04-24", 
              personnel_count: 8,
              sailing_summary: "Personnel feedback for Explorer sailing MEX-11-17April-CanarianFlavours: 8 personnel mentions identified with positive feedback for crew friendliness and service quality."
            }
          ],
          all_personnel: [
            {
              ship_name: "explorer",
              sailing_number: "MEX-10-17Jan-AtlanticIslands",
              sheet_name: "Dining",
              personnel_mentions: "Waiter John was exceptional - very attentive and friendly throughout our stay. Made our dining experience memorable."
            },
            {
              ship_name: "explorer", 
              sailing_number: "MEX-10-17Jan-AtlanticIslands",
              sheet_name: "Cabin Service",
              personnel_mentions: "Housekeeping staff Maria did an outstanding job keeping our cabin clean and tidy. Always had a smile and was very professional."
            },
            {
              ship_name: "explorer",
              sailing_number: "MEX-11-17April-CanarianFlavours", 
              sheet_name: "Entertainment",
              personnel_mentions: "The entertainment team, especially David from the dance crew, was fantastic. Great energy and really engaged with the audience."
            }
          ],
          total_personnel: 20,
          sailing_count: 2
        }
      };

      console.log('Personnel mock response:', mockResponse);
      setPersonnelData(mockResponse.data);
      
    } catch (error) {
      console.error('Error fetching personnel data:', error);
      alert('Personnel API not yet implemented. Showing mock data for demo purposes.');
      
      // Set mock data on error too
      const mockData = {
        sailing_summaries: [],
        all_personnel: [],
        total_personnel: 0,
        sailing_count: 0
      };
      setPersonnelData(mockData);
    } finally {
      setLoading(false);
      console.log('=== PERSONNEL FETCH DEBUG END ===');
    }
  };

  if (sheetsError) {
    console.error('Error loading sheets:', sheetsError);
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-white/80 to-green-50/80 backdrop-blur-sm rounded-xl p-6 border border-white/20 apollo-shadow">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg shadow-lg">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Personnel Mentions & Recognition
            </h1>
            <p className="text-gray-600 mt-1">Track and analyze staff mentions and feedback across all sailings</p>
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
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <span className="text-lg font-bold text-gray-900">Personnel Configuration</span>
                <p className="text-sm text-gray-600 font-normal">Select sheets and parameters for personnel analysis</p>
                <Badge variant="outline" className="mt-1 text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                  Under Development
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-base font-medium">Select Sheets to Analyze</Label>
              {sheetsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
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
                              selectedSheets.includes(sheet) ? "bg-green-50" : ""
                            )}
                            onClick={() => handleSheetToggle(sheet)}
                          >
                            <span className="text-sm">{sheet}</span>
                            {selectedSheets.includes(sheet) && (
                              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
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

            <div className="pt-2">              <Button 
                onClick={fetchPersonnel} 
                className="w-full bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg cursor-not-allowed"
                disabled={true}
              >
                <div className="flex items-center justify-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>Feature Under Development</span>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Section */}
      {personnelData ? (
        <div className="space-y-6">
          {/* Sailing Summaries Section */}
          <Card className="apollo-shadow bg-white/70 backdrop-blur-sm border-white/20">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <span className="text-lg font-bold text-gray-900">Personnel Summaries</span>
                  <p className="text-sm text-gray-600 font-normal">Overview of staff mentions by sailing</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {personnelData?.sailing_summaries && Array.isArray(personnelData.sailing_summaries) && personnelData.sailing_summaries.length > 0 ? (
                  <div className="space-y-6">
                    {personnelData.sailing_summaries.map((sailing: any, index: number) => (
                      <div key={index} className="group relative bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-green-200">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="h-3 w-3 bg-green-500 rounded-full shadow-sm"></div>
                              <h4 className="font-bold text-lg text-gray-900 capitalize">
                                {sailing.ship_name || 'Unknown Ship'}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs font-medium bg-green-50 text-green-700 border-green-200">
                                Sailing: {sailing.sailing_number || 'N/A'}
                              </Badge>
                              <Badge variant="secondary" className="text-xs font-medium bg-blue-50 text-blue-700">
                                {sailing.personnel_count || 0} Personnel Mentions
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Star className="h-4 w-4 text-green-500" />
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
                                    Personnel Summary
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
                                      <p className="text-gray-500 italic">No personnel summary available</p>
                                    )}
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        </div>
                        
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-500">
                      <p className="font-medium">Personnel Summary Data</p>
                      <p className="text-sm mt-1">
                        API not yet implemented. This will show personnel mentions data once the backend is ready.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Personnel Analysis */}
          <Card className="apollo-shadow bg-white/70 backdrop-blur-sm border-white/20">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <span className="text-lg font-bold text-gray-900">All Personnel Mentions - Detailed Analysis</span>
                  <p className="text-sm text-gray-600 font-normal">Comprehensive breakdown of staff recognition and feedback</p>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {personnelData.all_personnel && Array.isArray(personnelData.all_personnel) && personnelData.all_personnel.length > 0 && (                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-lg text-gray-900">Detailed Personnel Reports</h4>                      <div className="flex items-center gap-3">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={expandAllPersonnel}
                            className="text-xs hover:bg-green-50"
                          >
                            <Expand className="h-3 w-3 mr-1" />
                            Expand All
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={collapseAllPersonnel}
                            className="text-xs hover:bg-gray-50"
                          >
                            <Minimize2 className="h-3 w-3 mr-1" />
                            Collapse All
                          </Button>
                        </div>
                        <Badge variant="secondary" className="text-sm px-3 py-1">
                          {personnelData.all_personnel.length} Total Mentions
                        </Badge>
                      </div>
                    </div>                    
                    <div className="space-y-6 pr-2">
                      {sortData(personnelData.all_personnel, sortConfig, 'personnel').map((personnel: any, index: number) => (
                        <div key={index} className="group relative bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-green-200">
                          {/* Personnel Header */}
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="h-3 w-3 bg-green-500 rounded-full shadow-sm"></div>
                                <h5 className="font-bold text-lg text-gray-900 capitalize">
                                  {personnel.ship_name || 'Unknown Ship'}
                                </h5>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs font-medium bg-green-50 text-green-700 border-green-200">
                                  Sailing: {personnel.sailing_number || 'N/A'}
                                </Badge>
                                {personnel.sheet_name && (
                                  <Badge variant="secondary" className="text-xs font-medium bg-gray-100 text-gray-700">
                                    {personnel.sheet_name}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Star className="h-4 w-4 text-amber-500" />
                              <span>Mention #{index + 1}</span>
                            </div>
                          </div>

                          {/* Personnel Content */}
                          <div className="space-y-3">
                            <div className="border-l-4 border-green-400 pl-4">
                              <Collapsible 
                                open={expandedPersonnel[`personnel-${index}`]} 
                                onOpenChange={() => togglePersonnelExpansion(`personnel-${index}`)}
                              >
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent"
                                  >
                                    <h6 className="font-medium text-gray-800 flex items-center gap-2">
                                      <span className="h-2 w-2 bg-green-400 rounded-full"></span>
                                      Personnel Details
                                    </h6>
                                    <div className="flex items-center gap-2">
                                      <Badge 
                                        variant="outline" 
                                        className={cn(
                                          "text-xs transition-colors",
                                          expandedPersonnel[`personnel-${index}`] 
                                            ? "bg-green-50 text-green-700 border-green-200" 
                                            : "bg-gray-50 text-gray-600 border-gray-200"
                                        )}
                                      >
                                        {expandedPersonnel[`personnel-${index}`] ? 'Click to collapse' : 'Click to expand'}
                                      </Badge>
                                      {expandedPersonnel[`personnel-${index}`] ? (
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
                                      {personnel.personnel_mentions ? (
                                        <FormattedText 
                                          text={personnel.personnel_mentions} 
                                          className="text-gray-800"
                                        />
                                      ) : (
                                        <p className="text-gray-500 italic">No detailed personnel mentions available</p>
                                      )}
                                    </div>
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                          </div>
                          
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Personnel Summary Footer */}
                    <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-green-700">
                          <BarChart3 className="h-4 w-4" />
                          <span className="font-medium">Analysis Complete</span>
                        </div>
                        <div className="text-green-600">
                          {personnelData.all_personnel.length} personnel mentions analyzed across {
                            (() => {
                              try {
                                const ships = [...new Set(personnelData.all_personnel.map((personnel: any) => personnel?.ship_name).filter(Boolean))];
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
        </div>
      ) : loading ? (
        <Card className="apollo-shadow bg-white/70 backdrop-blur-sm border-white/20">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600"></div>
                <div className="absolute inset-0 rounded-full h-12 w-12 border-4 border-transparent border-r-emerald-400 animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-gray-700 mb-1">Loading Personnel Data</p>
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
                <Users className="h-16 w-16 text-gray-300" />
                <div className="absolute -top-2 -right-2 h-6 w-6 bg-green-100 rounded-full flex items-center justify-center">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 mb-2">Ready to Analyze Personnel Mentions</p>
                <p className="text-gray-600 mb-4">Configure your filters and click "Get Personnel Mentions" to view staff recognition data</p>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200 max-w-md mx-auto">
                  <p className="text-sm text-green-700 font-medium mb-2">Getting Started:</p>
                  <ul className="text-xs text-green-600 space-y-1 text-left">
                    <li>• Select ships and date ranges</li>
                    <li>• Choose relevant sheets to analyze</li>
                    <li>• Click "Get Personnel Mentions"</li>
                  </ul>
                  <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                    <strong>Note:</strong> Personnel API is under development. Mock data will be shown for demonstration.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Personnel;
