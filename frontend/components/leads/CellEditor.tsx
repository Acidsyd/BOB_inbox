'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ColumnDefinition, 
  Lead, 
  ValidationError, 
  CellEditorProps 
} from '@/types/spreadsheet';
import { validateCellValue, formatCellValue } from '@/lib/spreadsheetUtils';
import { cn } from '@/lib/utils';
import { CalendarIcon, CheckIcon, XIcon } from 'lucide-react';

interface CellEditorInternalProps extends CellEditorProps {
  className?: string;
}

const CellEditor: React.FC<CellEditorInternalProps> = ({
  value: initialValue,
  column,
  lead,
  onChange,
  onComplete,
  onCancel,
  isValid: externalIsValid,
  validationError: externalValidationError,
  className
}) => {
  const [value, setValue] = useState(initialValue ?? '');
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Auto-focus on mount
  useEffect(() => {
    const activeElement = inputRef.current || textareaRef.current || selectRef.current;
    if (activeElement) {
      activeElement.focus();
      
      // Select all text for text inputs
      if (inputRef.current && typeof initialValue === 'string') {
        inputRef.current.select();
      }
    }
  }, [initialValue]);
  
  // Validate value
  const validate = useCallback((val: any): ValidationError | null => {
    if (externalValidationError) return externalValidationError;
    return validateCellValue(val, column);
  }, [column, externalValidationError]);
  
  // Handle value change
  const handleValueChange = useCallback((newValue: any) => {
    setValue(newValue);
    
    const error = validate(newValue);
    setValidationError(error);
    
    onChange(newValue);
  }, [onChange, validate]);
  
  // Handle completion
  const handleComplete = useCallback(() => {
    const error = validate(value);
    if (!error) {
      onComplete();
    }
  }, [value, validate, onComplete]);
  
  // Handle key events
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
        if (!event.shiftKey || column.type !== 'text') {
          event.preventDefault();
          handleComplete();
        }
        break;
      case 'Escape':
        event.preventDefault();
        onCancel();
        break;
      case 'Tab':
        event.preventDefault();
        handleComplete();
        break;
    }
  }, [column.type, handleComplete, onCancel]);
  
  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isOutsideInput = !inputRef.current?.contains(event.target as Node) &&
                            !textareaRef.current?.contains(event.target as Node) &&
                            !selectRef.current?.contains(event.target as Node) &&
                            !dropdownRef.current?.contains(event.target as Node);
      
      if (isOutsideInput) {
        handleComplete();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleComplete]);
  
  // Render based on column type
  const renderEditor = () => {
    const baseClassName = cn(
      "w-full h-full px-2 py-1 text-sm border-0 outline-none focus:ring-0",
      validationError && "border-red-500 bg-red-50",
      className
    );
    
    switch (column.type) {
      case 'text':
        return (
          <input
            ref={inputRef}
            type="text"
            value={String(value)}
            onChange={(e) => handleValueChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className={baseClassName}
            placeholder={column.name}
            maxLength={column.validation?.maxLength}
          />
        );
      
      case 'email':
        return (
          <input
            ref={inputRef}
            type="email"
            value={String(value)}
            onChange={(e) => handleValueChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className={baseClassName}
            placeholder="email@example.com"
          />
        );
      
      case 'phone':
        return (
          <input
            ref={inputRef}
            type="tel"
            value={String(value)}
            onChange={(e) => handleValueChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className={baseClassName}
            placeholder="+1 (555) 123-4567"
          />
        );
      
      case 'number':
        return (
          <input
            ref={inputRef}
            type="number"
            value={value === null || value === undefined ? '' : String(value)}
            onChange={(e) => {
              const numValue = e.target.value === '' ? null : parseFloat(e.target.value);
              handleValueChange(numValue);
            }}
            onKeyDown={handleKeyDown}
            className={baseClassName}
            placeholder="0"
            step="any"
          />
        );
      
      case 'url':
        return (
          <input
            ref={inputRef}
            type="url"
            value={String(value)}
            onChange={(e) => handleValueChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className={baseClassName}
            placeholder="https://example.com"
          />
        );
      
      case 'boolean':
        return (
          <select
            ref={selectRef}
            value={value === true ? 'true' : value === false ? 'false' : ''}
            onChange={(e) => {
              const val = e.target.value === 'true' ? true : 
                          e.target.value === 'false' ? false : null;
              handleValueChange(val);
            }}
            onKeyDown={handleKeyDown}
            className={baseClassName}
          >
            <option value="">Select...</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );
      
      case 'select':
        return (
          <div className="relative">
            <select
              ref={selectRef}
              value={String(value)}
              onChange={(e) => handleValueChange(e.target.value || null)}
              onKeyDown={handleKeyDown}
              className={baseClassName}
            >
              <option value="">Select...</option>
              {column.selectOptions?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );
      
      case 'date':
        return (
          <div className="relative">
            <input
              ref={inputRef}
              type="date"
              value={value ? new Date(value).toISOString().split('T')[0] : ''}
              onChange={(e) => {
                const dateValue = e.target.value ? new Date(e.target.value).toISOString() : null;
                handleValueChange(dateValue);
              }}
              onKeyDown={handleKeyDown}
              className={baseClassName}
            />
          </div>
        );
      
      case 'tags':
        const tagsValue = Array.isArray(value) ? value : 
                         typeof value === 'string' ? value.split(',').map(s => s.trim()) :
                         [];
        
        return (
          <input
            ref={inputRef}
            type="text"
            value={tagsValue.join(', ')}
            onChange={(e) => {
              const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
              handleValueChange(tags);
            }}
            onKeyDown={handleKeyDown}
            className={baseClassName}
            placeholder="tag1, tag2, tag3"
          />
        );
      
      case 'formula':
        return (
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={String(value)}
              onChange={(e) => handleValueChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className={cn(baseClassName, "font-mono")}
              placeholder="=FORMULA()"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
              f(x)
            </div>
          </div>
        );
      
      case 'enrichment':
        return (
          <div className="flex items-center justify-between h-full px-2 py-1 bg-gray-50">
            <span className="text-sm text-gray-600">
              {value ? formatCellValue(value, column) : 'Click to enrich'}
            </span>
            <button
              onClick={() => {
                // Trigger enrichment
                console.log('Triggering enrichment for', lead.id, column.key);
              }}
              className="text-xs text-purple-600 hover:text-purple-700"
            >
              Enrich
            </button>
          </div>
        );
      
      default:
        return (
          <input
            ref={inputRef}
            type="text"
            value={String(value)}
            onChange={(e) => handleValueChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className={baseClassName}
            placeholder={column.name}
          />
        );
    }
  };
  
  return (
    <div className="relative w-full h-full">
      {/* Main editor */}
      <div className="w-full h-full bg-white border border-purple-500 shadow-sm">
        {renderEditor()}
      </div>
      
      {/* Validation error tooltip */}
      {validationError && (
        <div className="absolute top-full left-0 z-50 mt-1 px-2 py-1 bg-red-600 text-white text-xs rounded shadow-lg whitespace-nowrap">
          {validationError.message}
          <div className="absolute bottom-full left-2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-red-600" />
        </div>
      )}
      
      {/* Action buttons for certain types */}
      {(column.type === 'formula' || column.type === 'enrichment') && (
        <div className="absolute top-full left-0 right-0 z-40 mt-1 bg-white border border-gray-200 rounded shadow-sm p-2">
          <div className="flex gap-2">
            <button
              onClick={handleComplete}
              className="flex items-center px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              <CheckIcon className="w-3 h-3 mr-1" />
              Apply
            </button>
            <button
              onClick={onCancel}
              className="flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              <XIcon className="w-3 h-3 mr-1" />
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Helper text for certain types */}
      {column.type === 'formula' && (
        <div className="absolute top-full left-0 right-0 z-30 mt-8 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          <div className="font-medium mb-1">Formula Help:</div>
          <div>• Use column names in brackets: [First Name]</div>
          <div>• Functions: CONCAT(), UPPER(), LOWER(), LENGTH()</div>
          <div>• Example: CONCAT([First Name], " ", [Last Name])</div>
        </div>
      )}
    </div>
  );
};

export default CellEditor;