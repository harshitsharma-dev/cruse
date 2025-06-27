import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Users, ChevronDown, ChevronUp, Download, Loader2, Settings, Expand, Minimize2, Check, X, BarChart3, Star, Heart, Frown, Meh } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiService } from '../services/api';
import { useQuery } from '@tanstack/react-query';
import BasicFilter from '../components/BasicFilter';
import { FormattedText } from '../components/FormattedText';

import { BasicFilterState, createIssuesApiData, debugFilters } from '../utils/filterUtils';
import { sortData, toggleSort, SortConfig } from '../utils/sortingUtils';
import { useFilter } from '../contexts/FilterContext';

interface CrewMention {
  crewName: string;
  sentiments: Array<{
    sentiment: string; // Changed from 'positive' | 'negative' | 'neutral' to string
    mentions: Array<{
      sheetName: string;
      commentSnippet: string;
      comment: string;
    }>;
  }>;
}

interface SailingData {
  sailingNumber: string;
  crewMentions: CrewMention[];
}

interface PersonnelData {
  status: string;
  data: SailingData[];
}

const Personnel = () => {
  const { filterState } = useFilter(); // Use shared filter context
  const basicFilterRef = useRef<{ applyFilters: () => void; hasPendingChanges: () => boolean }>(null);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [personnelData, setPersonnelData] = useState<PersonnelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSailings, setExpandedSailings] = useState<Record<string, boolean>>({});
  const [expandedCrew, setExpandedCrew] = useState<Record<string, boolean>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [crewNameFilter, setCrewNameFilter] = useState<string>('');

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
  };  const handleFilterChange = (newFilters: BasicFilterState) => {
    debugFilters('FILTER CHANGE IN PERSONNEL', newFilters);
    // No need to set local state since we're using FilterContext
  };

  const toggleSailingExpansion = (sailingNumber: string) => {
    setExpandedSailings(prev => ({
      ...prev,
      [sailingNumber]: !prev[sailingNumber]
    }));
  };

  const toggleCrewExpansion = (crewKey: string) => {
    setExpandedCrew(prev => ({
      ...prev,
      [crewKey]: !prev[crewKey]
    }));
  };

  const toggleCommentExpansion = (commentKey: string) => {
    setExpandedComments(prev => ({
      ...prev,
      [commentKey]: !prev[commentKey]
    }));
  };
  const expandAllSailings = () => {
    if (!personnelData?.data) return;
    const allExpanded: Record<string, boolean> = {};
    personnelData.data.forEach((sailing: SailingData) => {
      allExpanded[sailing.sailingNumber] = true;
    });
    setExpandedSailings(allExpanded);
  };

  const collapseAllSailings = () => {
    setExpandedSailings({});
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <Heart className="h-4 w-4 text-green-600" />;
      case 'negative':
        return <Frown className="h-4 w-4 text-red-600" />;
      case 'neutral':
        return <Meh className="h-4 w-4 text-gray-600" />;
      default:
        return <Meh className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSentimentBadgeColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800';
      case 'negative':
        return 'bg-red-100 text-red-800';
      case 'neutral':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  const fetchPersonnel = async () => {
    console.log('=== PERSONNEL FETCH DEBUG START ===');
    console.log('Current filters object:', filterState);
    console.log('Selected sheets:', selectedSheets);
    console.log('Sheets data:', sheetsData?.data);
    
    // Auto-apply basic filters if they have pending changes
    if (basicFilterRef.current?.hasPendingChanges()) {
      console.log('Auto-applying basic filters before personnel search...');
      basicFilterRef.current.applyFilters();
      // Small delay to ensure filters are applied
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setLoading(true);
    try {
      // Create API payload similar to Issues page format
      const requestData = {
        ships: filterState.ships && filterState.ships.length > 0 
          ? filterState.ships.map((ship: string) => ship.split(':')[1] || ship)
          : [],
        sailing_numbers: filterState.sailingNumbers && filterState.sailingNumbers.length > 0 
          ? filterState.sailingNumbers 
          : [],
        sheets: selectedSheets.length > 0 
          ? selectedSheets 
          : (sheetsData?.data && sheetsData.data.length > 0 ? sheetsData.data : []),
        start_date: filterState.useAllDates ? "-1" : filterState.dateRange?.startDate || "",
        end_date: filterState.useAllDates ? "-1" : filterState.dateRange?.endDate || "",
        fleets: filterState.fleets || []
      };

      console.log('=== PERSONNEL PAYLOAD DEBUG ===');
      console.log('Final personnel payload:', requestData);
      
      const response = await apiService.getPersonnelList(requestData);
      console.log('Personnel API response:', response);
      setPersonnelData(response);
      
    } catch (error) {
      console.error('Error fetching personnel data:', error);
      alert('Failed to fetch personnel data. Please try again.');
      setPersonnelData(null);
    } finally {
      setLoading(false);
      console.log('=== PERSONNEL FETCH DEBUG END ===');
    }  };

  if (sheetsError) {
    console.error('Error loading sheets:', sheetsError);
  }
  const getFilteredData = () => {
    if (!personnelData?.data) return [];
    
    return personnelData.data.filter(sailing => {
      return sailing.crewMentions.some(crew => {
        // Filter by crew name
        if (crewNameFilter && !crew.crewName.toLowerCase().includes(crewNameFilter.toLowerCase())) {
          return false;
        }
        
        // Filter by sentiment
        if (sentimentFilter !== 'all') {
          return crew.sentiments.some(sentiment => sentiment.sentiment === sentimentFilter);
        }
        
        return true;
      });
    });
  };

  const getTotalCrewCount = () => {
    if (!personnelData?.data) return 0;
    const allCrew = new Set();
    personnelData.data.forEach(sailing => {
      sailing.crewMentions.forEach(crew => {
        allCrew.add(crew.crewName);
      });
    });
    return allCrew.size;
  };

  const getTotalMentionsCount = () => {
    if (!personnelData?.data) return 0;
    let count = 0;
    personnelData.data.forEach(sailing => {
      sailing.crewMentions.forEach(crew => {
        crew.sentiments.forEach(sentiment => {
          count += sentiment.mentions.length;
        });
      });
    });
    return count;
  };

  const exportResults = () => {
    if (!personnelData?.data || personnelData.data.length === 0) {
      alert('No results to export');
      return;
    }

    const csvRows = [];
    csvRows.push(['Sailing Number', 'Crew Name', 'Sentiment', 'Sheet Name', 'Comment Snippet', 'Full Comment']);

    personnelData.data.forEach(sailing => {
      sailing.crewMentions.forEach(crew => {
        crew.sentiments.forEach(sentiment => {
          sentiment.mentions.forEach(mention => {
            csvRows.push([
              sailing.sailingNumber,
              crew.crewName,
              sentiment.sentiment,
              mention.sheetName,
              mention.commentSnippet?.replace(/"/g, '""') || '',
              mention.comment?.replace(/"/g, '""') || ''
            ]);
          });
        });
      });
    });

    const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'personnel-mentions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-0">
      <div className="bg-gradient-to-r from-white/80 to-green-50/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/20 apollo-shadow">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg shadow-lg">
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Personnel Recognition
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Analyze crew mentions and guest feedback for staff recognition</p>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <BasicFilter 
          ref={basicFilterRef}
          onFilterChange={handleFilterChange}
          showTitle={true}
          compact={false}
        />

        {/* Sheet Selection & Controls */}
        <Card className="apollo-shadow bg-white/70 backdrop-blur-sm border-white/20">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Settings className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <span className="text-lg font-bold text-gray-900">Personnel Configuration</span>
                <p className="text-sm text-gray-600 font-normal">Select sheets and parameters for personnel analysis</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Sheet Selection */}
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

            {/* Filtering Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Sentiment Filter</Label>
                <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sentiments</SelectItem>
                    <SelectItem value="positive">Positive Only</SelectItem>
                    <SelectItem value="negative">Negative Only</SelectItem>
                    <SelectItem value="neutral">Neutral Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Crew Name Filter</Label>
                <input
                  type="text"
                  value={crewNameFilter}
                  onChange={(e) => setCrewNameFilter(e.target.value)}
                  placeholder="Search crew name..."
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button 
                onClick={fetchPersonnel} 
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg"
                disabled={loading}
              >
                <div className="flex items-center justify-center gap-2">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  <span>{loading ? 'Loading...' : 'Get Personnel Mentions'}</span>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>      {/* Results Section */}
      {personnelData?.data && personnelData.data.length > 0 ? (
        <div className="space-y-6">
          {/* Summary Stats */}
          <Card className="apollo-shadow bg-white/70 backdrop-blur-sm border-white/20">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <span className="text-lg font-bold text-gray-900">Personnel Analysis Summary</span>
                    <p className="text-sm text-gray-600 font-normal">Overview of crew mentions across all sailings</p>
                  </div>
                </CardTitle>
                <div className="flex gap-2">
                  <Button onClick={exportResults} variant="outline" size="sm" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={expandAllSailings}
                    className="text-xs hover:bg-green-50"
                  >
                    <Expand className="h-3 w-3 mr-1" />
                    Expand All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={collapseAllSailings}
                    className="text-xs hover:bg-gray-50"
                  >
                    <Minimize2 className="h-3 w-3 mr-1" />
                    Collapse All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Total Sailings</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{personnelData.data.length}</p>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Unique Crew Members</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900 mt-1">{getTotalCrewCount()}</p>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700">Total Mentions</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900 mt-1">{getTotalMentionsCount()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Personnel Data */}
          <div className="space-y-4">
            {getFilteredData().map((sailing, sailingIndex) => (
              <Card key={sailing.sailingNumber} className="apollo-shadow bg-white/70 backdrop-blur-sm border-white/20">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
                  <Collapsible 
                    open={expandedSailings[sailing.sailingNumber]} 
                    onOpenChange={() => toggleSailingExpansion(sailing.sailingNumber)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent"
                      >
                        <CardTitle className="flex items-center gap-2">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Users className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="text-left">
                            <span className="text-lg font-bold text-gray-900">Sailing: {sailing.sailingNumber}</span>
                            <p className="text-sm text-gray-600 font-normal">{sailing.crewMentions.length} crew members mentioned</p>
                          </div>
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {expandedSailings[sailing.sailingNumber] ? 'Click to collapse' : 'Click to expand'}
                          </Badge>
                          {expandedSailings[sailing.sailingNumber] ? (
                            <ChevronUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      </Button>
                    </CollapsibleTrigger>                    <CollapsibleContent>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          {sailing.crewMentions
                            .filter(crew => {
                              // Apply crew name filter
                              if (crewNameFilter && !crew.crewName.toLowerCase().includes(crewNameFilter.toLowerCase())) {
                                return false;
                              }
                              // Apply sentiment filter
                              if (sentimentFilter !== 'all') {
                                return crew.sentiments.some(sentiment => sentiment.sentiment === sentimentFilter);
                              }
                              return true;
                            })
                            .map((crew, crewIndex) => (
                            <div key={`${sailing.sailingNumber}-${crew.crewName}-${crewIndex}`} className="pb-4 border-b border-gray-200 last:border-b-0">
                              <Collapsible 
                                open={expandedCrew[`${sailing.sailingNumber}-${crew.crewName}`]} 
                                onOpenChange={() => toggleCrewExpansion(`${sailing.sailingNumber}-${crew.crewName}`)}
                              >
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="flex items-center justify-between w-full p-0 h-auto hover:bg-gray-50 rounded px-2 py-2"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
                                      <h4 className="font-bold text-lg text-gray-900">{crew.crewName}</h4>
                                      <div className="flex gap-1">
                                        {crew.sentiments.map((sentiment, sentIndex) => (
                                          <Badge 
                                            key={sentIndex}
                                            className={cn("text-xs", getSentimentBadgeColor(sentiment.sentiment))}
                                          >
                                            {getSentimentIcon(sentiment.sentiment)}
                                            <span className="ml-1 capitalize">{sentiment.sentiment}</span>
                                            <span className="ml-1">({sentiment.mentions.length})</span>
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                    {expandedCrew[`${sailing.sailingNumber}-${crew.crewName}`] ? (
                                      <ChevronUp className="h-4 w-4 text-blue-600" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 text-blue-600" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>

                                <CollapsibleContent className="mt-3 ml-6">
                                  <div className="space-y-3">
                                    {crew.sentiments
                                      .filter(sentiment => sentimentFilter === 'all' || sentiment.sentiment === sentimentFilter)
                                      .map((sentiment, sentimentIndex) => (
                                        sentiment.mentions.map((mention, mentionIndex) => (
                                          <div key={`${sentimentIndex}-${mentionIndex}`} className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-400">
                                            <div className="flex items-center justify-between mb-2">
                                              <div className="flex items-center gap-2">
                                                {getSentimentIcon(sentiment.sentiment)}
                                                <Badge 
                                                  className={cn("text-xs", getSentimentBadgeColor(sentiment.sentiment))}
                                                >
                                                  {sentiment.sentiment}
                                                </Badge>
                                                <Badge variant="secondary" className="text-xs">
                                                  {mention.sheetName}
                                                </Badge>
                                              </div>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleCommentExpansion(`${sailing.sailingNumber}-${crew.crewName}-${sentimentIndex}-${mentionIndex}`)}
                                                className="text-xs h-auto p-1"
                                              >
                                                {expandedComments[`${sailing.sailingNumber}-${crew.crewName}-${sentimentIndex}-${mentionIndex}`] ? 'Show Less' : 'Show Full Comment'}
                                              </Button>
                                            </div>
                                            
                                            <div className="bg-blue-50 rounded p-3 mb-2">
                                              <p className="text-sm font-medium text-blue-900 mb-1">Key Mention:</p>
                                              <FormattedText 
                                                text={mention.commentSnippet} 
                                                className="text-blue-800 text-sm"
                                              />
                                            </div>
                                            
                                            {expandedComments[`${sailing.sailingNumber}-${crew.crewName}-${sentimentIndex}-${mentionIndex}`] && (
                                              <div className="bg-white rounded p-3 border border-gray-200">
                                                <p className="text-sm font-medium text-gray-900 mb-1">Full Comment:</p>
                                                <FormattedText 
                                                  text={mention.comment} 
                                                  className="text-gray-700 text-sm"
                                                />
                                              </div>
                                            )}
                                          </div>
                                        ))
                                      ))}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </CardHeader>
              </Card>
            ))}
          </div>
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
                <p className="text-sm text-gray-500">Analyzing crew mentions and feedback...</p>
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
                <p className="text-gray-600 mb-4">Configure your filters and click "Get Personnel Mentions" to view crew recognition data</p>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200 max-w-md mx-auto">
                  <p className="text-sm text-green-700 font-medium mb-2">Getting Started:</p>
                  <ul className="text-xs text-green-600 space-y-1 text-left">
                    <li>• Select ships and date ranges</li>
                    <li>• Choose relevant sheets to analyze</li>
                    <li>• Apply sentiment and crew name filters</li>
                    <li>• Click "Get Personnel Mentions"</li>
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

export default Personnel;
