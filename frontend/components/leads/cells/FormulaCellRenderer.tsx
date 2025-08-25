'use client';

/**
 * Formula Cell Renderer
 * Displays calculated formula values with indicators and error handling
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Lead, ColumnDefinition, CellRendererProps } from '@/types/spreadsheet';
import { cn } from '@/lib/utils';

// Icons
import {
  Calculator,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Eye,
  Code,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Clock,
  Info
} from 'lucide-react';

// UI Components
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

export interface FormulaCellData {
  result: any;
  formula: string;
  isCalculating: boolean;
  error?: string;
  executionTime?: number;
  lastCalculated?: string;
  dependencies?: string[];
  cacheHit?: boolean;
  confidence?: number;
}

interface FormulaCellRendererProps extends Omit<CellRendererProps, 'value'> {
  value: FormulaCellData;
  onRecalculate?: () => void;
  onShowFormula?: () => void;
  showExecutionTime?: boolean;
  showDependencies?: boolean;
}

const FormulaCellRenderer: React.FC<FormulaCellRendererProps> = ({
  value: cellData,
  column,
  lead,
  isSelected,
  isEditing,
  onClick,
  onDoubleClick,
  onKeyDown,
  onRecalculate,
  onShowFormula,
  showExecutionTime = false,
  showDependencies = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Format the result value for display
  const formattedValue = useMemo(() => {
    if (cellData.isCalculating) {
      return '...';
    }

    if (cellData.error) {
      return '#ERROR';
    }

    const result = cellData.result;
    
    if (result === null || result === undefined) {
      return '';
    }

    // Format based on column type and result type
    if (typeof result === 'number') {
      if (column.formatting?.numberFormat) {
        const format = column.formatting.numberFormat;
        let formatted = result.toFixed(format.decimals || 0);
        
        if (format.prefix) {
          formatted = format.prefix + formatted;
        }
        if (format.suffix) {
          formatted = formatted + format.suffix;
        }
        
        return formatted;
      }
      
      // Default number formatting
      if (Number.isInteger(result)) {
        return result.toLocaleString();
      } else {
        return result.toFixed(2);
      }
    }

    if (typeof result === 'boolean') {
      return result ? 'TRUE' : 'FALSE';
    }

    if (result instanceof Date) {
      return result.toLocaleDateString();
    }

    if (typeof result === 'object') {
      return JSON.stringify(result);
    }

    return String(result);
  }, [cellData, column.formatting]);

  // Get cell status color and icon
  const cellStatus = useMemo(() => {
    if (cellData.isCalculating) {
      return {
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: RefreshCw,
        status: 'calculating'
      };
    }

    if (cellData.error) {
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: AlertTriangle,
        status: 'error'
      };
    }

    if (cellData.cacheHit) {
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: Zap,
        status: 'cached'
      };
    }

    return {
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      icon: Calculator,
      status: 'calculated'
    };
  }, [cellData]);

  // Get trend indicator for numeric values
  const trendIndicator = useMemo(() => {
    if (typeof cellData.result !== 'number' || !cellData.lastCalculated) {
      return null;
    }

    // This would typically compare with previous value
    // For now, we'll use a mock trend based on the value
    const trend = cellData.result > 50 ? 'up' : cellData.result < 20 ? 'down' : 'stable';
    
    switch (trend) {
      case 'up':
        return { icon: TrendingUp, color: 'text-green-500', direction: 'positive' };
      case 'down':
        return { icon: TrendingDown, color: 'text-red-500', direction: 'negative' };
      default:
        return { icon: Minus, color: 'text-gray-400', direction: 'stable' };
    }
  }, [cellData.result, cellData.lastCalculated]);

  // Tooltip content
  const tooltipContent = useMemo(() => {
    const parts = [];

    parts.push(`Formula: ${cellData.formula}`);
    
    if (cellData.error) {
      parts.push(`Error: ${cellData.error}`);
    } else {
      parts.push(`Result: ${formattedValue}`);
    }

    if (cellData.executionTime) {
      parts.push(`Execution: ${cellData.executionTime.toFixed(2)}ms`);
    }

    if (cellData.lastCalculated) {
      parts.push(`Last calculated: ${new Date(cellData.lastCalculated).toLocaleString()}`);
    }

    if (cellData.dependencies && cellData.dependencies.length > 0) {
      parts.push(`Dependencies: ${cellData.dependencies.join(', ')}`);
    }

    if (cellData.cacheHit) {
      parts.push('Result from cache');
    }

    return parts.join('\n');
  }, [cellData, formattedValue]);

  const StatusIcon = cellStatus.icon;

  return (
    <TooltipProvider>
      <div
        className={cn(
          'relative w-full h-full flex items-center px-2 py-1 border-l border-r group',
          cellStatus.borderColor,
          isSelected && 'ring-2 ring-blue-500 ring-inset',
          isEditing && 'ring-2 ring-purple-500 ring-inset',
          'hover:bg-opacity-80 cursor-pointer transition-all duration-150'
        )}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Main content */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {/* Status indicator */}
            <div className={cn('flex-shrink-0', cellStatus.color)}>
              <StatusIcon 
                className={cn(
                  'h-3 w-3',
                  cellData.isCalculating && 'animate-spin'
                )} 
              />
            </div>

            {/* Value display */}
            <div className={cn(
              'flex-1 truncate text-sm font-mono',
              cellData.error ? 'text-red-600 font-semibold' : 'text-gray-900',
              cellData.isCalculating && 'text-blue-600'
            )}>
              {formattedValue}
            </div>

            {/* Trend indicator for numbers */}
            {trendIndicator && !cellData.error && !cellData.isCalculating && (
              <div className={cn('flex-shrink-0', trendIndicator.color)}>
                <trendIndicator.icon className="h-3 w-3" />
              </div>
            )}
          </div>

          {/* Action buttons (shown on hover or selection) */}
          {(isHovered || isSelected) && !isEditing && (
            <div className="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Recalculate button */}
              {!cellData.isCalculating && onRecalculate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRecalculate();
                      }}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Recalculate</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Show formula button */}
              {onShowFormula && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShowFormula();
                      }}
                    >
                      <Code className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Show formula</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Info button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0"
                  >
                    <Info className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="whitespace-pre-wrap text-xs">
                    {tooltipContent}
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Bottom indicators */}
        {(showExecutionTime || showDependencies || cellData.confidence !== undefined) && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center px-1 py-0.5 text-xs">
            {/* Left side indicators */}
            <div className="flex items-center space-x-2">
              {showExecutionTime && cellData.executionTime && (
                <Badge variant="outline" className="text-xs h-4">
                  <Clock className="h-2 w-2 mr-1" />
                  {cellData.executionTime.toFixed(1)}ms
                </Badge>
              )}
              
              {cellData.confidence !== undefined && (
                <Badge 
                  variant={cellData.confidence > 0.8 ? 'default' : cellData.confidence > 0.6 ? 'secondary' : 'destructive'}
                  className="text-xs h-4"
                >
                  {Math.round(cellData.confidence * 100)}%
                </Badge>
              )}
            </div>

            {/* Right side indicators */}
            <div className="flex items-center space-x-1">
              {showDependencies && cellData.dependencies && cellData.dependencies.length > 0 && (
                <Badge variant="outline" className="text-xs h-4">
                  {cellData.dependencies.length} deps
                </Badge>
              )}
              
              {cellData.cacheHit && (
                <div className="text-green-500" title="Cached result">
                  <Zap className="h-2 w-2" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {cellData.isCalculating && (
          <div className="absolute inset-0 bg-blue-50 bg-opacity-50 flex items-center justify-center">
            <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
          </div>
        )}

        {/* Error overlay */}
        {cellData.error && (
          <div className="absolute inset-0 bg-red-50 bg-opacity-25" />
        )}
      </div>
    </TooltipProvider>
  );
};

export default FormulaCellRenderer;