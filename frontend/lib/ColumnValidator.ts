/**
 * Column Validation System
 * Comprehensive validation for column data types and custom rules
 */

import { ColumnDefinition, ColumnType, Lead } from '@/types/spreadsheet';

// Validation Result Types
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings: string[];
  suggestions: string[];
  formattedValue?: any;
}

export interface CrossColumnValidationRule {
  id: string;
  name: string;
  description: string;
  columns: string[];
  validator: (values: Record<string, any>, lead: Lead) => ValidationResult;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  type: 'format' | 'range' | 'length' | 'pattern' | 'custom' | 'dependency';
  parameters: Record<string, any>;
  severity: 'error' | 'warning' | 'info';
  validator: (value: any, column: ColumnDefinition, lead?: Lead) => ValidationResult;
}

// Built-in Validation Rules
export class ValidationRulesRegistry {
  private static rules = new Map<string, ValidationRule>();
  private static crossColumnRules = new Map<string, CrossColumnValidationRule>();

  static initialize(): void {
    this.registerBuiltInRules();
    this.registerCrossColumnRules();
  }

  // Register validation rule
  static registerRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule);
  }

  // Register cross-column validation rule
  static registerCrossColumnRule(rule: CrossColumnValidationRule): void {
    this.crossColumnRules.set(rule.id, rule);
  }

  // Get all rules
  static getAllRules(): ValidationRule[] {
    return Array.from(this.rules.values());
  }

  // Get rules by type
  static getRulesByType(type: string): ValidationRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.type === type);
  }

  // Get rule by ID
  static getRule(id: string): ValidationRule | undefined {
    return this.rules.get(id);
  }

  // Get cross-column rules
  static getCrossColumnRules(): CrossColumnValidationRule[] {
    return Array.from(this.crossColumnRules.values());
  }

  // Register built-in validation rules
  private static registerBuiltInRules(): void {
    // Email validation
    this.registerRule({
      id: 'email_format',
      name: 'Email Format',
      description: 'Validates email address format',
      type: 'format',
      parameters: {},
      severity: 'error',
      validator: (value) => {
        if (!value || typeof value !== 'string') {
          return { isValid: true, warnings: [], suggestions: [] };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = emailRegex.test(value.toLowerCase());

        if (!isValid) {
          return {
            isValid: false,
            error: 'Invalid email format',
            warnings: [],
            suggestions: ['Check for typos in the email address', 'Ensure @ symbol and domain are present']
          };
        }

        // Additional checks for common issues
        const warnings: string[] = [];
        const suggestions: string[] = [];

        // Check for common domain typos
        const commonTypos = {
          'gamil.com': 'gmail.com',
          'yahooo.com': 'yahoo.com',
          'hotmial.com': 'hotmail.com',
          'outlok.com': 'outlook.com'
        };

        const domain = value.split('@')[1]?.toLowerCase();
        if (domain && commonTypos[domain]) {
          warnings.push(`Possible domain typo: ${domain}`);
          suggestions.push(`Did you mean ${commonTypos[domain]}?`);
        }

        // Check for suspicious patterns
        if (value.includes('..') || value.startsWith('.') || value.endsWith('.')) {
          warnings.push('Email contains suspicious dot patterns');
        }

        return {
          isValid: true,
          warnings,
          suggestions,
          formattedValue: value.toLowerCase().trim()
        };
      }
    });

    // Phone number validation
    this.registerRule({
      id: 'phone_format',
      name: 'Phone Format',
      description: 'Validates phone number format',
      type: 'format',
      parameters: {},
      severity: 'error',
      validator: (value) => {
        if (!value || typeof value !== 'string') {
          return { isValid: true, warnings: [], suggestions: [] };
        }

        const cleaned = value.replace(/[\s\-\(\)\.]/g, '');
        const digits = cleaned.replace(/\D/g, '');

        if (digits.length < 10 || digits.length > 15) {
          return {
            isValid: false,
            error: `Phone number should have 10-15 digits, got ${digits.length}`,
            warnings: [],
            suggestions: ['Include country code for international numbers', 'Remove any letters or special characters']
          };
        }

        // Format phone number
        let formattedValue = digits;
        if (digits.length === 10) {
          // US format
          formattedValue = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        } else if (digits.length === 11 && digits.startsWith('1')) {
          // US with country code
          formattedValue = `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
        } else {
          // International format
          formattedValue = `+${digits}`;
        }

        return {
          isValid: true,
          warnings: [],
          suggestions: [],
          formattedValue
        };
      }
    });

    // URL validation
    this.registerRule({
      id: 'url_format',
      name: 'URL Format',
      description: 'Validates URL format',
      type: 'format',
      parameters: {},
      severity: 'error',
      validator: (value) => {
        if (!value || typeof value !== 'string') {
          return { isValid: true, warnings: [], suggestions: [] };
        }

        try {
          let urlToTest = value.trim();
          
          // Add protocol if missing
          if (!/^https?:\/\//i.test(urlToTest)) {
            urlToTest = 'https://' + urlToTest;
          }

          const url = new URL(urlToTest);
          
          const warnings: string[] = [];
          const suggestions: string[] = [];

          // Check for HTTP vs HTTPS
          if (url.protocol === 'http:') {
            warnings.push('Using HTTP instead of HTTPS');
            suggestions.push('Consider using HTTPS for better security');
          }

          // Check for suspicious TLDs
          const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf'];
          if (suspiciousTlds.some(tld => url.hostname.endsWith(tld))) {
            warnings.push('Domain uses a potentially suspicious TLD');
          }

          return {
            isValid: true,
            warnings,
            suggestions,
            formattedValue: url.toString()
          };
        } catch (error) {
          return {
            isValid: false,
            error: 'Invalid URL format',
            warnings: [],
            suggestions: ['Ensure the URL includes a valid domain', 'Check for typos in the URL']
          };
        }
      }
    });

    // Number range validation
    this.registerRule({
      id: 'number_range',
      name: 'Number Range',
      description: 'Validates number is within specified range',
      type: 'range',
      parameters: { min: 0, max: 100 },
      severity: 'error',
      validator: (value, column) => {
        if (value === null || value === undefined || value === '') {
          return { isValid: true, warnings: [], suggestions: [] };
        }

        const num = Number(value);
        if (isNaN(num)) {
          return {
            isValid: false,
            error: 'Value must be a number',
            warnings: [],
            suggestions: ['Enter a valid number']
          };
        }

        const validation = column.validation;
        if (!validation) return { isValid: true, warnings: [], suggestions: [] };

        const min = (validation as any).min;
        const max = (validation as any).max;

        if (min !== undefined && num < min) {
          return {
            isValid: false,
            error: `Number must be at least ${min}`,
            warnings: [],
            suggestions: [`Enter a value between ${min} and ${max || '∞'}`]
          };
        }

        if (max !== undefined && num > max) {
          return {
            isValid: false,
            error: `Number must be at most ${max}`,
            warnings: [],
            suggestions: [`Enter a value between ${min || '-∞'} and ${max}`]
          };
        }

        return { isValid: true, warnings: [], suggestions: [] };
      }
    });

    // Text length validation
    this.registerRule({
      id: 'text_length',
      name: 'Text Length',
      description: 'Validates text length is within specified limits',
      type: 'length',
      parameters: { minLength: 0, maxLength: 255 },
      severity: 'error',
      validator: (value, column) => {
        if (!value || typeof value !== 'string') {
          return { isValid: true, warnings: [], suggestions: [] };
        }

        const validation = column.validation;
        if (!validation) return { isValid: true, warnings: [], suggestions: [] };

        const minLength = validation.minLength;
        const maxLength = validation.maxLength;

        if (minLength !== undefined && value.length < minLength) {
          return {
            isValid: false,
            error: `Text must be at least ${minLength} characters long`,
            warnings: [],
            suggestions: [`Current length: ${value.length}, required: ${minLength}`]
          };
        }

        if (maxLength !== undefined && value.length > maxLength) {
          return {
            isValid: false,
            error: `Text must be at most ${maxLength} characters long`,
            warnings: [],
            suggestions: [`Current length: ${value.length}, limit: ${maxLength}`]
          };
        }

        const warnings: string[] = [];
        if (maxLength && value.length > maxLength * 0.9) {
          warnings.push(`Approaching character limit (${value.length}/${maxLength})`);
        }

        return { isValid: true, warnings, suggestions: [] };
      }
    });

    // Pattern validation (regex)
    this.registerRule({
      id: 'pattern_match',
      name: 'Pattern Match',
      description: 'Validates value matches specified pattern',
      type: 'pattern',
      parameters: { pattern: '.*' },
      severity: 'error',
      validator: (value, column) => {
        if (!value || typeof value !== 'string') {
          return { isValid: true, warnings: [], suggestions: [] };
        }

        const validation = column.validation;
        if (!validation?.pattern) return { isValid: true, warnings: [], suggestions: [] };

        try {
          const regex = new RegExp(validation.pattern);
          const isValid = regex.test(value);

          if (!isValid) {
            return {
              isValid: false,
              error: `Value does not match required pattern`,
              warnings: [],
              suggestions: ['Check the format requirements for this field']
            };
          }

          return { isValid: true, warnings: [], suggestions: [] };
        } catch (error) {
          return {
            isValid: false,
            error: 'Invalid pattern configuration',
            warnings: [],
            suggestions: []
          };
        }
      }
    });

    // Required field validation
    this.registerRule({
      id: 'required_field',
      name: 'Required Field',
      description: 'Validates that required fields are not empty',
      type: 'custom',
      parameters: {},
      severity: 'error',
      validator: (value, column) => {
        if (!column.required) {
          return { isValid: true, warnings: [], suggestions: [] };
        }

        const isEmpty = value === null || 
                       value === undefined || 
                       (typeof value === 'string' && value.trim() === '') ||
                       (Array.isArray(value) && value.length === 0);

        if (isEmpty) {
          return {
            isValid: false,
            error: 'This field is required',
            warnings: [],
            suggestions: ['Enter a value for this required field']
          };
        }

        return { isValid: true, warnings: [], suggestions: [] };
      }
    });

    // Date validation
    this.registerRule({
      id: 'date_format',
      name: 'Date Format',
      description: 'Validates date format and range',
      type: 'format',
      parameters: {},
      severity: 'error',
      validator: (value) => {
        if (!value) {
          return { isValid: true, warnings: [], suggestions: [] };
        }

        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return {
            isValid: false,
            error: 'Invalid date format',
            warnings: [],
            suggestions: ['Use format: YYYY-MM-DD or MM/DD/YYYY', 'Ensure month and day are valid']
          };
        }

        const warnings: string[] = [];
        const suggestions: string[] = [];

        // Check for reasonable date ranges
        const currentYear = new Date().getFullYear();
        const year = date.getFullYear();

        if (year < 1900) {
          warnings.push('Date is very old');
        } else if (year > currentYear + 10) {
          warnings.push('Date is far in the future');
        }

        return {
          isValid: true,
          warnings,
          suggestions,
          formattedValue: date.toISOString().split('T')[0]
        };
      }
    });
  }

  // Register cross-column validation rules
  private static registerCrossColumnRules(): void {
    // Email domain matches company validation
    this.registerCrossColumnRule({
      id: 'email_company_match',
      name: 'Email-Company Match',
      description: 'Validates that email domain matches company domain',
      columns: ['email', 'company'],
      severity: 'warning',
      validator: (values) => {
        const email = values.email;
        const company = values.company;

        if (!email || !company) {
          return { isValid: true, warnings: [], suggestions: [] };
        }

        const emailDomain = email.split('@')[1]?.toLowerCase();
        const companyName = company.toLowerCase();

        if (!emailDomain) {
          return { isValid: true, warnings: [], suggestions: [] };
        }

        // Check if domains match approximately
        const warnings: string[] = [];
        const suggestions: string[] = [];

        // Simple domain matching (can be enhanced with more sophisticated logic)
        const companyWords = companyName.replace(/[^a-z0-9]/g, ' ').split(' ').filter(w => w.length > 2);
        const domainMatches = companyWords.some(word => 
          emailDomain.includes(word) || word.includes(emailDomain.split('.')[0])
        );

        if (!domainMatches) {
          warnings.push('Email domain may not match company');
          suggestions.push('Verify that the email belongs to this company');
        }

        return { isValid: true, warnings, suggestions };
      }
    });

    // Name consistency validation
    this.registerCrossColumnRule({
      id: 'name_consistency',
      name: 'Name Consistency',
      description: 'Validates consistency between first name, last name, and full name',
      columns: ['firstName', 'lastName', 'fullName'],
      severity: 'warning',
      validator: (values) => {
        const firstName = values.firstName;
        const lastName = values.lastName;
        const fullName = values.fullName;

        const warnings: string[] = [];
        const suggestions: string[] = [];

        if (firstName && lastName && fullName) {
          const expectedFullName = `${firstName} ${lastName}`.toLowerCase();
          const actualFullName = fullName.toLowerCase();

          if (!actualFullName.includes(firstName.toLowerCase()) || 
              !actualFullName.includes(lastName.toLowerCase())) {
            warnings.push('Full name does not match first and last names');
            suggestions.push('Check for consistency in name fields');
          }
        }

        return { isValid: true, warnings, suggestions };
      }
    });

    // Phone and location validation
    this.registerCrossColumnRule({
      id: 'phone_location_match',
      name: 'Phone-Location Match',
      description: 'Validates phone number country code matches location',
      columns: ['phone', 'country', 'state'],
      severity: 'info',
      validator: (values) => {
        const phone = values.phone;
        const country = values.country;

        if (!phone || !country) {
          return { isValid: true, warnings: [], suggestions: [] };
        }

        const warnings: string[] = [];
        const suggestions: string[] = [];

        // Basic country code validation
        const phoneDigits = phone.replace(/\D/g, '');
        
        if (country.toLowerCase() === 'usa' || country.toLowerCase() === 'united states') {
          if (!phoneDigits.startsWith('1') && phoneDigits.length === 10) {
            // US number without country code is OK
          } else if (phoneDigits.startsWith('1') && phoneDigits.length === 11) {
            // US number with country code is OK
          } else {
            warnings.push('Phone number format may not match US location');
          }
        } else if (phoneDigits.startsWith('1')) {
          warnings.push('Phone has US country code but location is not US');
        }

        return { isValid: true, warnings, suggestions };
      }
    });
  }
}

// Main Column Validator Class
export class ColumnValidator {
  private rules: ValidationRule[] = [];
  private crossColumnRules: CrossColumnValidationRule[] = [];

  constructor() {
    ValidationRulesRegistry.initialize();
    this.loadDefaultRules();
  }

  // Load default validation rules
  private loadDefaultRules(): void {
    this.rules = ValidationRulesRegistry.getAllRules();
    this.crossColumnRules = ValidationRulesRegistry.getCrossColumnRules();
  }

  // Validate single cell value
  validateCell(
    value: any, 
    column: ColumnDefinition, 
    lead?: Lead
  ): ValidationResult {
    let result: ValidationResult = {
      isValid: true,
      warnings: [],
      suggestions: []
    };

    // Type-specific validation
    const typeValidation = this.validateByType(value, column);
    if (!typeValidation.isValid) {
      return typeValidation;
    }

    // Merge warnings and suggestions
    result.warnings.push(...typeValidation.warnings);
    result.suggestions.push(...typeValidation.suggestions);
    if (typeValidation.formattedValue !== undefined) {
      result.formattedValue = typeValidation.formattedValue;
    }

    // Apply column-specific rules
    if (column.validation) {
      for (const rule of this.rules) {
        try {
          const ruleResult = rule.validator(value, column, lead);
          
          if (!ruleResult.isValid) {
            if (rule.severity === 'error') {
              return {
                isValid: false,
                error: ruleResult.error,
                warnings: [...result.warnings, ...ruleResult.warnings],
                suggestions: [...result.suggestions, ...ruleResult.suggestions]
              };
            } else {
              result.warnings.push(ruleResult.error || '');
            }
          }

          result.warnings.push(...ruleResult.warnings);
          result.suggestions.push(...ruleResult.suggestions);
          
          if (ruleResult.formattedValue !== undefined) {
            result.formattedValue = ruleResult.formattedValue;
          }
        } catch (error) {
          console.warn(`Validation rule ${rule.id} failed:`, error);
        }
      }
    }

    // Custom validator
    if (column.validation?.customValidator) {
      try {
        const customResult = column.validation.customValidator(value);
        if (typeof customResult === 'string') {
          result.warnings.push(customResult);
        } else if (typeof customResult === 'boolean' && !customResult) {
          return {
            isValid: false,
            error: 'Custom validation failed',
            warnings: result.warnings,
            suggestions: result.suggestions
          };
        }
      } catch (error) {
        result.warnings.push('Custom validation error');
      }
    }

    return result;
  }

  // Validate by column type
  private validateByType(value: any, column: ColumnDefinition): ValidationResult {
    if (value === null || value === undefined || value === '') {
      return { isValid: true, warnings: [], suggestions: [] };
    }

    switch (column.type) {
      case 'email':
        return ValidationRulesRegistry.getRule('email_format')!.validator(value, column);
      
      case 'phone':
        return ValidationRulesRegistry.getRule('phone_format')!.validator(value, column);
      
      case 'url':
        return ValidationRulesRegistry.getRule('url_format')!.validator(value, column);
      
      case 'number':
        return ValidationRulesRegistry.getRule('number_range')!.validator(value, column);
      
      case 'date':
        return ValidationRulesRegistry.getRule('date_format')!.validator(value, column);
      
      case 'text':
        return ValidationRulesRegistry.getRule('text_length')!.validator(value, column);
      
      case 'boolean':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false' && value !== 0 && value !== 1) {
          return {
            isValid: false,
            error: 'Value must be true/false or 1/0',
            warnings: [],
            suggestions: ['Use true/false or 1/0 for boolean values']
          };
        }
        return { isValid: true, warnings: [], suggestions: [] };
      
      case 'select':
        if (column.selectOptions) {
          const validOptions = column.selectOptions.map(opt => opt.value);
          if (!validOptions.includes(value)) {
            return {
              isValid: false,
              error: `Value must be one of: ${validOptions.join(', ')}`,
              warnings: [],
              suggestions: [`Available options: ${validOptions.join(', ')}`]
            };
          }
        }
        return { isValid: true, warnings: [], suggestions: [] };
      
      default:
        return { isValid: true, warnings: [], suggestions: [] };
    }
  }

  // Validate cross-column relationships
  validateCrossColumn(
    lead: Lead, 
    columns: ColumnDefinition[]
  ): Record<string, ValidationResult> {
    const results: Record<string, ValidationResult> = {};

    for (const rule of this.crossColumnRules) {
      try {
        const values: Record<string, any> = {};
        
        // Gather values for rule columns
        for (const columnKey of rule.columns) {
          const column = columns.find(col => col.key === columnKey);
          if (column) {
            values[columnKey] = lead[columnKey as keyof Lead] || 
                               lead.extendedFields[columnKey];
          }
        }

        const result = rule.validator(values, lead);
        
        if (!result.isValid || result.warnings.length > 0) {
          results[rule.id] = result;
        }
      } catch (error) {
        console.warn(`Cross-column validation rule ${rule.id} failed:`, error);
      }
    }

    return results;
  }

  // Batch validate leads
  validateBatch(
    leads: Lead[], 
    columns: ColumnDefinition[]
  ): Record<string, Record<string, ValidationResult>> {
    const results: Record<string, Record<string, ValidationResult>> = {};

    for (const lead of leads) {
      const leadResults: Record<string, ValidationResult> = {};

      // Validate each column
      for (const column of columns) {
        if (column.editable) {
          const value = lead[column.key as keyof Lead] || 
                       lead.extendedFields[column.key];
          const validation = this.validateCell(value, column, lead);
          
          if (!validation.isValid || validation.warnings.length > 0) {
            leadResults[column.key] = validation;
          }
        }
      }

      // Cross-column validation
      const crossValidation = this.validateCrossColumn(lead, columns);
      Object.assign(leadResults, crossValidation);

      if (Object.keys(leadResults).length > 0) {
        results[lead.id] = leadResults;
      }
    }

    return results;
  }

  // Add custom validation rule
  addRule(rule: ValidationRule): void {
    ValidationRulesRegistry.registerRule(rule);
    this.loadDefaultRules();
  }

  // Add custom cross-column rule
  addCrossColumnRule(rule: CrossColumnValidationRule): void {
    ValidationRulesRegistry.registerCrossColumnRule(rule);
    this.loadDefaultRules();
  }
}

// Export singleton instance
export const columnValidator = new ColumnValidator();