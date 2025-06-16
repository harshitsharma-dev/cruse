
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { apiService } from '../services/api';
import BasicFilter from '../components/BasicFilter';
import { useQuery } from '@tanstack/react-query';

const Issues = () => {
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [issuesData, setIssuesData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<any>({});

  // Fetch available sheets from API
  const { data: sheetsData, isLoading: sheetsLoading, error: sheetsError } = useQuery({
    queryKey: ['sheets'],
    queryFn: () => apiService.getSheets(),
  });

  const handleSheetChange = (sheet: string, checked: boolean) => {
    setSelectedSheets(prev => 
      checked ? [...prev, sheet] : prev.filter(s => s !== sheet)
    );
  };

  const handleFilterChange = (newFilters: any) => {
    console.log('Filter change in Issues:', newFilters);
    setFilters(newFilters);
  };

  const fetchIssues = async () => {
    if (!filters.fromDate || !filters.toDate) {
      alert('Please select date range from the basic filters');
      return;
    }

    if (!filters.fleets || filters.fleets.length === 0) {
      alert('Please select at least one fleet from the basic filters');
      return;
    }

    if (!filters.ships || filters.ships.length === 0) {
      alert('Please select at least one ship from the basic filters');
      return;
    }

    setLoading(true);
    try {
      const issuesFilters = {
        filter_by: 'date',
        filters: {
          fromDate: filters.fromDate,
          toDate: filters.toDate
        },
        sheets: selectedSheets.length > 0 ? selectedSheets : sheetsData?.data || []
      };

      console.log('Sending issues request:', issuesFilters);
      const response = await apiService.getIssuesSummary(issuesFilters);
      console.log('Issues response:', response);
      setIssuesData(response.data);
    } catch (error) {
      console.error('Error fetching issues:', error);
      alert('Failed to fetch issues data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sheetsError) {
    console.error('Error loading sheets:', sheetsError);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Issues Summary</h1>
        <p className="text-gray-600 mt-2">Analyze and track issues across sailings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <BasicFilter onFilterChange={handleFilterChange} />
          
          {/* Sheet Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Sheet Selection</CardTitle>
            </CardHeader>
            <CardContent>
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
                <div className="space-y-2">
                  {sheetsData?.data?.map((sheet: string) => (
                    <div key={sheet} className="flex items-center space-x-2">
                      <Checkbox
                        id={`issue-sheet-${sheet}`}
                        checked={selectedSheets.includes(sheet)}
                        onCheckedChange={(checked) => 
                          handleSheetChange(sheet, checked as boolean)
                        }
                      />
                      <Label htmlFor={`issue-sheet-${sheet}`} className="text-sm">
                        {sheet}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
              
              <Button 
                onClick={fetchIssues} 
                className="w-full mt-4"
                disabled={loading || !filters.fromDate || !filters.toDate || !filters.fleets?.length || !filters.ships?.length || sheetsLoading}
              >
                {loading ? 'Loading...' : 'Get Issues Summary'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
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
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
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
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading issues data...</p>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center text-gray-500">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Configure filters and click "Get Issues Summary" to view data</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Issues;
