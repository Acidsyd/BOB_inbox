'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ColumnDefinition,
  ColumnType,
  ViewConfig,
  ColumnManagerProps,
  SelectOption
} from '@/types/spreadsheet';
import { cn } from '@/lib/utils';
import {
  GripVertical,
  Eye,
  EyeOff,
  Settings,
  Plus,
  Trash2,
  Save,
  Pin,
  PinOff,
  Copy,
  Edit3,
  ChevronDown,
  ChevronRight,
  Type,
  Hash,
  Calendar,
  ToggleLeft as Toggle,
  Link,
  Tags,
  AtSign,
  Phone,
  Calculator,
  Zap,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ColumnManager: React.FC<ColumnManagerProps> = ({
  columns,
  onColumnsChange,
  onViewSave,
  availableViews
}) => {
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [showViewSave, setShowViewSave] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(new Set());
  
  const dragRef = useRef<HTMLDivElement>(null);
  
  // Column type icons and labels
  const columnTypeConfig = {
    text: { icon: Type, label: 'Text', color: 'bg-gray-100 text-gray-700' },
    email: { icon: AtSign, label: 'Email', color: 'bg-blue-100 text-blue-700' },
    phone: { icon: Phone, label: 'Phone', color: 'bg-green-100 text-green-700' },
    number: { icon: Hash, label: 'Number', color: 'bg-purple-100 text-purple-700' },
    date: { icon: Calendar, label: 'Date', color: 'bg-orange-100 text-orange-700' },
    select: { icon: ChevronDown, label: 'Select', color: 'bg-indigo-100 text-indigo-700' },
    boolean: { icon: ToggleLeft, label: 'Boolean', color: 'bg-pink-100 text-pink-700' },
    url: { icon: Link, label: 'URL', color: 'bg-cyan-100 text-cyan-700' },
    tags: { icon: Tags, label: 'Tags', color: 'bg-yellow-100 text-yellow-700' },
    formula: { icon: Calculator, label: 'Formula', color: 'bg-emerald-100 text-emerald-700' },
    enrichment: { icon: Zap, label: 'Enrichment', color: 'bg-violet-100 text-violet-700' }
  };
  
  // Handle drag start
  const handleDragStart = useCallback((columnId: string) => {
    setDraggedColumn(columnId);
  }, []);
  
  // Handle drag over
  const handleDragOver = useCallback((columnId: string, event: React.DragEvent) => {
    event.preventDefault();
    if (draggedColumn && draggedColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  }, [draggedColumn]);
  
  // Handle drop
  const handleDrop = useCallback((targetColumnId: string) => {
    if (!draggedColumn || draggedColumn === targetColumnId) return;
    
    const draggedIndex = columns.findIndex(col => col.id === draggedColumn);
    const targetIndex = columns.findIndex(col => col.id === targetColumnId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const newColumns = [...columns];
    const [movedColumn] = newColumns.splice(draggedIndex, 1);
    newColumns.splice(targetIndex, 0, movedColumn);
    
    onColumnsChange(newColumns);
    setDraggedColumn(null);
    setDragOverColumn(null);
  }, [columns, draggedColumn, onColumnsChange]);
  
  // Handle column visibility toggle
  const handleColumnVisibility = useCallback((columnId: string, visible: boolean) => {
    const newColumns = columns.map(col => 
      col.id === columnId ? { ...col, hidden: !visible } : col
    );
    onColumnsChange(newColumns);
  }, [columns, onColumnsChange]);
  
  // Handle column width change
  const handleColumnResize = useCallback((columnId: string, width: number) => {
    const newColumns = columns.map(col => 
      col.id === columnId ? { ...col, width: Math.max(50, Math.min(500, width)) } : col
    );
    onColumnsChange(newColumns);
  }, [columns, onColumnsChange]);
  
  // Handle column pin
  const handleColumnPin = useCallback((columnId: string, pin: 'left' | 'right' | null) => {
    const newColumns = columns.map(col => 
      col.id === columnId ? { ...col, pinned: pin } : col
    );
    onColumnsChange(newColumns);
  }, [columns, onColumnsChange]);
  
  // Handle column delete
  const handleColumnDelete = useCallback((columnId: string) => {
    const newColumns = columns.filter(col => col.id !== columnId);
    onColumnsChange(newColumns);
  }, [columns, onColumnsChange]);
  
  // Handle add new column
  const handleAddColumn = useCallback((type: ColumnType) => {
    const newColumn: ColumnDefinition = {
      id: `custom_${Date.now()}`,
      key: `custom_field_${Date.now()}`,
      name: `New ${columnTypeConfig[type]?.label || 'Column'}`,
      type,
      width: 150,
      minWidth: 80,
      resizable: true,
      sortable: true,
      filterable: true,
      editable: true,
      hidden: false,
      pinned: null
    };
    
    onColumnsChange([...columns, newColumn]);
    setShowAddColumn(false);
    setEditingColumn(newColumn.id);
  }, [columns, onColumnsChange, columnTypeConfig]);
  
  // Handle save view
  const handleSaveView = useCallback(() => {
    if (!newViewName.trim()) return;
    
    const view: ViewConfig = {
      name: newViewName,
      columnOrder: columns.map(col => col.id),
      columnWidths: columns.reduce((acc, col) => {
        acc[col.id] = col.width;
        return acc;
      }, {} as Record<string, number>),
      hiddenColumns: columns.filter(col => col.hidden).map(col => col.id),
      pinnedColumns: {
        left: columns.filter(col => col.pinned === 'left').map(col => col.id),
        right: columns.filter(col => col.pinned === 'right').map(col => col.id)
      },
      isDefault: false
    };
    
    onViewSave(view);
    setShowViewSave(false);
    setNewViewName('');
  }, [newViewName, columns, onViewSave]);
  
  // Toggle column expansion
  const toggleColumnExpansion = useCallback((columnId: string) => {
    const newExpanded = new Set(expandedColumns);
    if (newExpanded.has(columnId)) {
      newExpanded.delete(columnId);
    } else {
      newExpanded.add(columnId);
    }
    setExpandedColumns(newExpanded);
  }, [expandedColumns]);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Column Manager</h3>
          <p className="text-sm text-gray-600">
            Manage column visibility, order, and properties
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowViewSave(true)}
            variant="outline"
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            Save View
          </Button>
          <Button
            onClick={() => setShowAddColumn(true)}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Column
          </Button>
        </div>
      </div>
      
      {/* Saved Views */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Saved Views</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {availableViews.map((view) => (
              <Button
                key={view.id || view.name}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  // Apply view configuration
                  console.log('Apply view:', view);
                }}
              >
                {view.name}
                {view.isDefault && (
                  <Badge className="ml-2 bg-purple-100 text-purple-700 text-xs">
                    Default
                  </Badge>
                )}
              </Button>
            ))}
            {availableViews.length === 0 && (
              <p className="text-sm text-gray-500">No saved views yet</p>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Column List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Columns ({columns.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {columns.map((column, index) => {
              const typeConfig = columnTypeConfig[column.type] || columnTypeConfig.text;
              const TypeIcon = typeConfig.icon;
              const isExpanded = expandedColumns.has(column.id);
              const isEditing = editingColumn === column.id;
              
              return (
                <div
                  key={column.id}
                  className={cn(
                    "relative",
                    draggedColumn === column.id && "opacity-50",
                    dragOverColumn === column.id && "bg-purple-50"
                  )}
                  draggable
                  onDragStart={() => handleDragStart(column.id)}
                  onDragOver={(e) => handleDragOver(column.id, e)}
                  onDrop={() => handleDrop(column.id)}
                  onDragEnd={() => {
                    setDraggedColumn(null);
                    setDragOverColumn(null);
                  }}
                >
                  <div className="flex items-center p-4 hover:bg-gray-50">
                    {/* Drag Handle */}
                    <div className="mr-3 cursor-grab active:cursor-grabbing">
                      <GripVertical className="h-4 w-4 text-gray-400" />
                    </div>
                    
                    {/* Column Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        {/* Type Icon */}
                        <div className={cn("p-1.5 rounded", typeConfig.color)}>
                          <TypeIcon className="h-3 w-3" />
                        </div>
                        
                        {/* Name and Details */}
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <Input
                              defaultValue={column.name}
                              onBlur={(e) => {
                                const newColumns = columns.map(col =>
                                  col.id === column.id
                                    ? { ...col, name: e.target.value || col.name }
                                    : col
                                );
                                onColumnsChange(newColumns);
                                setEditingColumn(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                } else if (e.key === 'Escape') {
                                  setEditingColumn(null);
                                }
                              }}
                              className="text-sm font-medium"
                              autoFocus
                            />
                          ) : (
                            <div
                              className="text-sm font-medium text-gray-900 truncate cursor-pointer"
                              onClick={() => setEditingColumn(column.id)}
                            >
                              {column.name}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-500">
                              {typeConfig.label}
                            </span>
                            <span className="text-xs text-gray-500">
                              Width: {column.width}px
                            </span>
                            {column.pinned && (
                              <Badge className="text-xs bg-blue-100 text-blue-700">
                                Pinned {column.pinned}
                              </Badge>
                            )}
                            {column.required && (
                              <Badge className="text-xs bg-red-100 text-red-700">
                                Required
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      {/* Width Control */}
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={column.width}
                          onChange={(e) => {
                            const width = parseInt(e.target.value) || column.width;
                            handleColumnResize(column.id, width);
                          }}
                          className="w-16 h-7 text-xs"
                          min="50"
                          max="500"
                        />
                        <span className="text-xs text-gray-400">px</span>
                      </div>
                      
                      {/* Pin Toggle */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const nextPin = column.pinned === 'left' ? 'right' :
                                         column.pinned === 'right' ? null : 'left';
                          handleColumnPin(column.id, nextPin);
                        }}
                      >
                        {column.pinned ? (
                          <Pin className="h-4 w-4" />
                        ) : (
                          <PinOff className="h-4 w-4" />
                        )}
                      </Button>
                      
                      {/* Visibility Toggle */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleColumnVisibility(column.id, column.hidden)}
                      >
                        {column.hidden ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      
                      {/* Expand Toggle */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleColumnExpansion(column.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      
                      {/* Delete (for custom columns) */}
                      {column.key.startsWith('custom_') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleColumnDelete(column.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Expanded Configuration */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pl-16 bg-gray-50 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        {/* Basic Settings */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Field Key
                          </label>
                          <Input
                            value={column.key}
                            onChange={(e) => {
                              const newColumns = columns.map(col =>
                                col.id === column.id
                                  ? { ...col, key: e.target.value }
                                  : col
                              );
                              onColumnsChange(newColumns);
                            }}
                            className="text-xs"
                            disabled={!column.key.startsWith('custom_')}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Type
                          </label>
                          <select
                            value={column.type}
                            onChange={(e) => {
                              const newColumns = columns.map(col =>
                                col.id === column.id
                                  ? { ...col, type: e.target.value as ColumnType }
                                  : col
                              );
                              onColumnsChange(newColumns);
                            }}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                            disabled={!column.key.startsWith('custom_')}
                          >
                            {Object.entries(columnTypeConfig).map(([type, config]) => (
                              <option key={type} value={type}>
                                {config.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Checkboxes */}
                        <div className="col-span-2 grid grid-cols-3 gap-4">
                          <label className="flex items-center text-xs">
                            <input
                              type="checkbox"
                              checked={column.editable}
                              onChange={(e) => {
                                const newColumns = columns.map(col =>
                                  col.id === column.id
                                    ? { ...col, editable: e.target.checked }
                                    : col
                                );
                                onColumnsChange(newColumns);
                              }}
                              className="mr-2"
                            />
                            Editable
                          </label>
                          
                          <label className="flex items-center text-xs">
                            <input
                              type="checkbox"
                              checked={column.sortable}
                              onChange={(e) => {
                                const newColumns = columns.map(col =>
                                  col.id === column.id
                                    ? { ...col, sortable: e.target.checked }
                                    : col
                                );
                                onColumnsChange(newColumns);
                              }}
                              className="mr-2"
                            />
                            Sortable
                          </label>
                          
                          <label className="flex items-center text-xs">
                            <input
                              type="checkbox"
                              checked={column.filterable}
                              onChange={(e) => {
                                const newColumns = columns.map(col =>
                                  col.id === column.id
                                    ? { ...col, filterable: e.target.checked }
                                    : col
                                );
                                onColumnsChange(newColumns);
                              }}
                              className="mr-2"
                            />
                            Filterable
                          </label>
                          
                          <label className="flex items-center text-xs">
                            <input
                              type="checkbox"
                              checked={column.required}
                              onChange={(e) => {
                                const newColumns = columns.map(col =>
                                  col.id === column.id
                                    ? { ...col, required: e.target.checked }
                                    : col
                                );
                                onColumnsChange(newColumns);
                              }}
                              className="mr-2"
                            />
                            Required
                          </label>
                          
                          <label className="flex items-center text-xs">
                            <input
                              type="checkbox"
                              checked={column.resizable}
                              onChange={(e) => {
                                const newColumns = columns.map(col =>
                                  col.id === column.id
                                    ? { ...col, resizable: e.target.checked }
                                    : col
                                );
                                onColumnsChange(newColumns);
                              }}
                              className="mr-2"
                            />
                            Resizable
                          </label>
                        </div>
                        
                        {/* Select Options (for select type) */}
                        {column.type === 'select' && (
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-2">
                              Select Options
                            </label>
                            <div className="space-y-2">
                              {(column.selectOptions || []).map((option, optionIndex) => (
                                <div key={optionIndex} className="flex items-center gap-2">
                                  <Input
                                    value={option.value}
                                    onChange={(e) => {
                                      const newOptions = [...(column.selectOptions || [])];
                                      newOptions[optionIndex] = { ...option, value: e.target.value };
                                      const newColumns = columns.map(col =>
                                        col.id === column.id
                                          ? { ...col, selectOptions: newOptions }
                                          : col
                                      );
                                      onColumnsChange(newColumns);
                                    }}
                                    placeholder="Value"
                                    className="text-xs flex-1"
                                  />
                                  <Input
                                    value={option.label}
                                    onChange={(e) => {
                                      const newOptions = [...(column.selectOptions || [])];
                                      newOptions[optionIndex] = { ...option, label: e.target.value };
                                      const newColumns = columns.map(col =>
                                        col.id === column.id
                                          ? { ...col, selectOptions: newOptions }
                                          : col
                                      );
                                      onColumnsChange(newColumns);
                                    }}
                                    placeholder="Label"
                                    className="text-xs flex-1"
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      const newOptions = (column.selectOptions || []).filter((_, i) => i !== optionIndex);
                                      const newColumns = columns.map(col =>
                                        col.id === column.id
                                          ? { ...col, selectOptions: newOptions }
                                          : col
                                      );
                                      onColumnsChange(newColumns);
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const newOptions = [
                                    ...(column.selectOptions || []),
                                    { value: '', label: '', color: undefined }
                                  ];
                                  const newColumns = columns.map(col =>
                                    col.id === column.id
                                      ? { ...col, selectOptions: newOptions }
                                      : col
                                  );
                                  onColumnsChange(newColumns);
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Option
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Add Column Modal */}
      {showAddColumn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Add New Column
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAddColumn(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(columnTypeConfig).map(([type, config]) => {
                  const Icon = config.icon;
                  return (
                    <Button
                      key={type}
                      variant="outline"
                      className="h-16 flex flex-col items-center gap-2"
                      onClick={() => handleAddColumn(type as ColumnType)}
                    >
                      <div className={cn("p-2 rounded", config.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs">{config.label}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Save View Modal */}
      {showViewSave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Save Current View
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowViewSave(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  View Name
                </label>
                <Input
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  placeholder="Enter view name..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveView();
                    }
                  }}
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowViewSave(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveView}
                  disabled={!newViewName.trim()}
                >
                  Save View
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ColumnManager;