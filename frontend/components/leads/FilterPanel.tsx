'use client';

import React, { useState, useCallback } from 'react';
import {
  ColumnDefinition,
  FilterConfig,
  ColumnFilter,
  QuickFilter,
  FilterOperator,
  FilterPanelProps
} from '@/types/spreadsheet';
import { cn } from '@/lib/utils';
import {
  Filter,
  Plus,
  X,
  Search,
  Save,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const FilterPanel: React.FC<FilterPanelProps> = ({
  columns,
  filterConfig,
  onFilterChange,
  quickFilters,
  onQuickFilterToggle
}) => {
  const [showAddFilter, setShowAddFilter] = useState(false);
  const [newQuickFilterName, setNewQuickFilterName] = useState('');

  const filterOperators: { value: FilterOperator; label: string }[] = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does not contain' },
    { value: 'starts_with', label: 'Starts with' },
    { value: 'ends_with', label: 'Ends with' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'between', label: 'Between' },
    { value: 'in', label: 'In list' },
    { value: 'not_in', label: 'Not in list' }
  ];

  const handleSearchChange = useCallback((value: string) => {
    onFilterChange({
      ...filterConfig,
      searchTerm: value
    });
  }, [filterConfig, onFilterChange]);

  const handleAddFilter = useCallback(() => {
    const firstColumn = columns.find(col => col.filterable);
    if (!firstColumn) return;

    const newFilter: ColumnFilter = {
      columnId: firstColumn.id,
      operator: 'equals',
      value: ''
    };

    onFilterChange({
      ...filterConfig,
      activeFilters: [...filterConfig.activeFilters, newFilter]
    });
    setShowAddFilter(false);
  }, [columns, filterConfig, onFilterChange]);

  const handleFilterUpdate = useCallback((index: number, updates: Partial<ColumnFilter>) => {
    const newFilters = [...filterConfig.activeFilters];
    newFilters[index] = { ...newFilters[index], ...updates };
    
    onFilterChange({
      ...filterConfig,
      activeFilters: newFilters
    });
  }, [filterConfig, onFilterChange]);

  const handleFilterRemove = useCallback((index: number) => {
    const newFilters = filterConfig.activeFilters.filter((_, i) => i !== index);
    onFilterChange({
      ...filterConfig,
      activeFilters: newFilters
    });
  }, [filterConfig, onFilterChange]);

  const handleClearAll = useCallback(() => {
    onFilterChange({
      activeFilters: [],
      quickFilters: [],
      searchTerm: ''
    });
  }, [onFilterChange]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search across all fields..."
          value={filterConfig.searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Quick Filters */}
      {quickFilters.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Quick Filters</h4>
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((quickFilter) => (
              <Badge
                key={quickFilter.id}
                variant={quickFilter.isActive ? "default" : "secondary"}
                className={cn(
                  "cursor-pointer hover:opacity-80",
                  quickFilter.isActive && "bg-purple-600"
                )}
                onClick={() => onQuickFilterToggle(quickFilter.id)}
              >
                {quickFilter.name}
                {quickFilter.isActive && (
                  <X className="h-3 w-3 ml-1" />
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Active Filters */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700">
            Filters ({filterConfig.activeFilters.length})
          </h4>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddFilter}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Filter
            </Button>
            {filterConfig.activeFilters.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearAll}
              >
                Clear All
              </Button>
            )}
          </div>
        </div>

        {filterConfig.activeFilters.map((filter, index) => {
          const column = columns.find(col => col.id === filter.columnId);
          if (!column) return null;

          return (
            <Card key={index} className="p-3">
              <div className="flex items-center gap-3">
                {/* Column Selection */}
                <select
                  value={filter.columnId}
                  onChange={(e) => handleFilterUpdate(index, { columnId: e.target.value })}
                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                >
                  {columns.filter(col => col.filterable).map(col => (
                    <option key={col.id} value={col.id}>
                      {col.name}
                    </option>
                  ))}
                </select>

                {/* Operator Selection */}
                <select
                  value={filter.operator}
                  onChange={(e) => handleFilterUpdate(index, { operator: e.target.value as FilterOperator })}
                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                >
                  {filterOperators.map(op => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>

                {/* Value Input */}
                {!['is_empty', 'is_not_empty'].includes(filter.operator) && (
                  <Input
                    value={String(filter.value || '')}
                    onChange={(e) => handleFilterUpdate(index, { value: e.target.value })}
                    placeholder="Filter value..."
                    className="flex-1 text-sm"
                  />
                )}

                {/* Remove Button */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleFilterRemove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          );
        })}

        {filterConfig.activeFilters.length === 0 && (
          <div className="text-center py-6 text-gray-500 text-sm">
            No filters applied. Click "Add Filter" to start filtering your data.
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterPanel;