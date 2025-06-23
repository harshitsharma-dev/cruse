import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { SortConfig, SortDirection } from '../utils/sortingUtils';

interface SortOption {
  key: string;
  label: string;
}

interface SortControlsProps {
  sortOptions: readonly SortOption[];
  currentSort: SortConfig | null;
  onSortChange: (key: string) => void;
  className?: string;
}

export const SortControls: React.FC<SortControlsProps> = ({
  sortOptions,
  currentSort,
  onSortChange,
  className = ''
}) => {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <span className="text-sm font-medium text-gray-700">Sort by:</span>
      <Select
        value={currentSort?.key || ''}
        onValueChange={onSortChange}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select sort option" />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.key} value={option.key}>
              <div className="flex items-center gap-2">
                {option.label}
                {currentSort?.key === option.key && (
                  currentSort.direction === 'asc' ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {currentSort && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSortChange(currentSort.key)}
          className="flex items-center gap-1"
        >
          {currentSort.direction === 'asc' ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          {currentSort.direction === 'asc' ? 'Ascending' : 'Descending'}
        </Button>
      )}
    </div>
  );
};

interface SortableHeaderProps {
  children: React.ReactNode;
  sortKey: string;
  currentSort: SortConfig | null;
  onSort: (key: string) => void;
  className?: string;
}

export const SortableHeader: React.FC<SortableHeaderProps> = ({
  children,
  sortKey,
  currentSort,
  onSort,
  className = ''
}) => {
  const isActive = currentSort?.key === sortKey;
  const direction = currentSort?.direction;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onSort(sortKey)}
      className={`h-auto p-2 justify-start font-semibold hover:bg-gray-100 ${className}`}
    >
      <span>{children}</span>
      <div className="ml-1 flex flex-col">
        {!isActive && <ArrowUpDown className="h-3 w-3 text-gray-400" />}
        {isActive && direction === 'asc' && <ChevronUp className="h-3 w-3 text-blue-600" />}
        {isActive && direction === 'desc' && <ChevronDown className="h-3 w-3 text-blue-600" />}
      </div>
    </Button>
  );
};
