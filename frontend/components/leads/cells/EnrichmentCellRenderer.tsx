'use client';

/**
 * Enrichment Cell Renderer
 * Displays enriched data with status indicators, confidence scores, and source information
 */

import React, { useState, useMemo } from 'react';
import { Lead, ColumnDefinition, CellRendererProps } from '@/types/spreadsheet';
import { cn } from '@/lib/utils';

// Icons
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  ExternalLink,
  Star,
  Info,
  Eye,
  EyeOff,
  Shield,
  Zap,
  DollarSign,
  Calendar,
  Loader2
} from 'lucide-react';

// UI Components
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

export interface EnrichmentCellData {
  value: any;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  confidence?: number;
  source?: string;
  timestamp?: string;
  creditsUsed?: number;
  error?: string;
  rawData?: any;
  provider?: string;
  validationStatus?: 'valid' | 'invalid' | 'unknown';
  lastUpdated?: string;
  refreshCount?: number;
  costPerRefresh?: number;
  dataQuality?: number;
}

interface EnrichmentCellRendererProps extends Omit<CellRendererProps, 'value'> {
  value: EnrichmentCellData;
  onRefresh?: () => void;
  onViewRaw?: () => void;
  onCancel?: () => void;
  showSource?: boolean;
  showConfidence?: boolean;
  showCost?: boolean;
}

const STATUS_CONFIG = {
  pending: {
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    icon: Clock,
    label: 'Pending',
    badgeVariant: 'secondary' as const
  },
  processing: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: RefreshCw,
    label: 'Processing',
    badgeVariant: 'default' as const
  },
  completed: {
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: CheckCircle,
    label: 'Completed',
    badgeVariant: 'default' as const
  },
  failed: {
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: AlertTriangle,
    label: 'Failed',
    badgeVariant: 'destructive' as const
  },
  cancelled: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: AlertTriangle,
    label: 'Cancelled',
    badgeVariant: 'secondary' as const
  }
};

const VALIDATION_CONFIG = {
  valid: { color: 'text-green-600', icon: CheckCircle, label: 'Valid' },
  invalid: { color: 'text-red-600', icon: AlertTriangle, label: 'Invalid' },
  unknown: { color: 'text-gray-500', icon: Info, label: 'Unknown' }
};

const EnrichmentCellRenderer: React.FC<EnrichmentCellRendererProps> = ({
  value: cellData,
  column,
  lead,
  isSelected,
  isEditing,
  onClick,
  onDoubleClick,
  onKeyDown,
  onRefresh,
  onViewRaw,
  onCancel,
  showSource = true,
  showConfidence = true,
  showCost = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showRawData, setShowRawData] = useState(false);

  // Get status configuration
  const statusConfig = STATUS_CONFIG[cellData.status];
  const validationConfig = cellData.validationStatus 
    ? VALIDATION_CONFIG[cellData.validationStatus] 
    : null;

  // Format display value
  const formattedValue = useMemo(() => {
    if (cellData.status === 'pending') {
      return 'Waiting...';
    }

    if (cellData.status === 'processing') {
      return 'Enriching...';
    }

    if (cellData.status === 'failed') {
      return cellData.error || 'Failed';
    }

    if (cellData.status === 'cancelled') {
      return 'Cancelled';
    }

    const value = cellData.value;
    
    if (value === null || value === undefined || value === '') {
      return 'No data';
    }

    // Format based on data type
    if (typeof value === 'object' && value !== null) {
      // For complex objects, show a summary
      if (Array.isArray(value)) {
        return `${value.length} items`;
      } else {
        const keys = Object.keys(value);
        return keys.length > 0 ? keys[0] + (keys.length > 1 ? ` +${keys.length - 1}` : '') : 'Object';
      }
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (typeof value === 'number') {
      return value.toLocaleString();
    }

    return String(value);
  }, [cellData]);

  // Get confidence color and level
  const confidenceInfo = useMemo(() => {
    if (!cellData.confidence) return null;
    
    const confidence = cellData.confidence;
    let level: 'high' | 'medium' | 'low';
    let color: string;
    
    if (confidence >= 0.8) {
      level = 'high';
      color = 'text-green-600';
    } else if (confidence >= 0.6) {
      level = 'medium';
      color = 'text-yellow-600';
    } else {
      level = 'low';
      color = 'text-red-600';
    }
    
    return { level, color, percentage: Math.round(confidence * 100) };
  }, [cellData.confidence]);

  // Get data quality info
  const qualityInfo = useMemo(() => {
    if (!cellData.dataQuality) return null;
    
    const quality = cellData.dataQuality;
    let level: 'excellent' | 'good' | 'fair' | 'poor';
    let color: string;
    
    if (quality >= 0.9) {
      level = 'excellent';
      color = 'text-green-600';
    } else if (quality >= 0.7) {
      level = 'good';
      color = 'text-blue-600';
    } else if (quality >= 0.5) {
      level = 'fair';
      color = 'text-yellow-600';
    } else {
      level = 'poor';
      color = 'text-red-600';
    }
    
    return { level, color, percentage: Math.round(quality * 100) };
  }, [cellData.dataQuality]);

  // Create tooltip content
  const tooltipContent = useMemo(() => {
    const parts = [];
    
    parts.push(`Status: ${statusConfig.label}`);
    
    if (cellData.source) {
      parts.push(`Source: ${cellData.source}`);
    }
    
    if (cellData.provider) {
      parts.push(`Provider: ${cellData.provider}`);
    }
    
    if (cellData.confidence) {
      parts.push(`Confidence: ${Math.round(cellData.confidence * 100)}%`);
    }
    
    if (cellData.dataQuality) {
      parts.push(`Quality: ${Math.round(cellData.dataQuality * 100)}%`);
    }
    
    if (cellData.validationStatus) {
      parts.push(`Validation: ${validationConfig?.label}`);
    }
    
    if (cellData.timestamp) {
      parts.push(`Enriched: ${new Date(cellData.timestamp).toLocaleString()}`);
    }
    
    if (cellData.creditsUsed) {
      parts.push(`Credits: ${cellData.creditsUsed}`);
    }
    
    if (cellData.costPerRefresh) {
      parts.push(`Cost: $${cellData.costPerRefresh.toFixed(4)}`);
    }
    
    if (cellData.error) {
      parts.push(`Error: ${cellData.error}`);
    }
    
    return parts.join('\n');
  }, [cellData, statusConfig, validationConfig]);

  const StatusIcon = statusConfig.icon;

  return (
    <TooltipProvider>
      <div
        className={cn(
          'relative w-full h-full flex items-center px-2 py-1 border-l border-r group',
          statusConfig.borderColor,
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
            <div className={cn('flex-shrink-0', statusConfig.color)}>
              <StatusIcon 
                className={cn(
                  'h-3 w-3',
                  cellData.status === 'processing' && 'animate-spin'
                )} 
              />
            </div>

            {/* Value display */}
            <div className={cn(
              'flex-1 truncate text-sm',
              cellData.status === 'failed' ? 'text-red-600 font-medium' : 
              cellData.status === 'processing' ? 'text-blue-600' : 
              cellData.status === 'completed' ? 'text-gray-900' : 'text-gray-500'
            )}>
              {formattedValue}
            </div>

            {/* Confidence indicator */}
            {showConfidence && confidenceInfo && cellData.status === 'completed' && (
              <div className={cn('flex items-center space-x-1 flex-shrink-0', confidenceInfo.color)}>
                <Star className="h-3 w-3" />
                <span className="text-xs font-medium">{confidenceInfo.percentage}%</span>
              </div>
            )}

            {/* Validation indicator */}
            {validationConfig && cellData.status === 'completed' && (
              <div className={cn('flex-shrink-0', validationConfig.color)} title={validationConfig.label}>
                <validationConfig.icon className="h-3 w-3" />
              </div>
            )}
          </div>

          {/* Action buttons */}
          {(isHovered || isSelected) && !isEditing && (
            <div className="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Refresh button */}
              {cellData.status !== 'processing' && onRefresh && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRefresh();
                      }}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Refresh enrichment</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Cancel button */}
              {cellData.status === 'processing' && onCancel && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancel();
                      }}
                    >
                      <AlertTriangle className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Cancel enrichment</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* View raw data button */}
              {cellData.rawData && onViewRaw && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewRaw();
                      }}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>View raw data</p>
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
        <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center px-1 py-0.5">
          {/* Left side indicators */}
          <div className="flex items-center space-x-1">
            {showSource && cellData.source && cellData.status === 'completed' && (
              <Badge variant="outline" className="text-xs h-4">
                {cellData.source}
              </Badge>
            )}
            
            {qualityInfo && (
              <Badge 
                variant={qualityInfo.level === 'excellent' ? 'default' : 
                        qualityInfo.level === 'good' ? 'secondary' : 
                        qualityInfo.level === 'fair' ? 'secondary' : 'destructive'}
                className="text-xs h-4"
              >
                Q{qualityInfo.percentage}%
              </Badge>
            )}
          </div>

          {/* Right side indicators */}
          <div className="flex items-center space-x-1">
            {showCost && cellData.creditsUsed && (
              <Badge variant="outline" className="text-xs h-4">
                <DollarSign className="h-2 w-2 mr-1" />
                {cellData.creditsUsed}
              </Badge>
            )}
            
            {cellData.refreshCount && cellData.refreshCount > 1 && (
              <Badge variant="secondary" className="text-xs h-4">
                {cellData.refreshCount}x
              </Badge>
            )}
            
            {cellData.lastUpdated && (
              <div className="text-gray-400" title={`Updated: ${new Date(cellData.lastUpdated).toLocaleString()}`}>
                <Calendar className="h-2 w-2" />
              </div>
            )}
          </div>
        </div>

        {/* Processing overlay */}
        {cellData.status === 'processing' && (
          <div className="absolute inset-0 bg-blue-50 bg-opacity-30 flex items-center justify-center">
            <div className="text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}

        {/* Error overlay */}
        {cellData.status === 'failed' && (
          <div className="absolute inset-0 bg-red-50 bg-opacity-25" />
        )}

        {/* Success glow for high confidence results */}
        {cellData.status === 'completed' && confidenceInfo?.level === 'high' && (
          <div className="absolute inset-0 bg-green-100 bg-opacity-20 rounded" />
        )}

        {/* Progress bar for processing */}
        {cellData.status === 'processing' && (
          <div className="absolute bottom-0 left-0 right-0 h-1">
            <Progress value={undefined} className="h-1 bg-blue-200">
              <div className="h-full bg-blue-500 animate-pulse" />
            </Progress>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default EnrichmentCellRenderer;