/**
 * CSV Parser Utility
 * Handles CSV file parsing and validation for lead data
 */

export interface LeadData {
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  company?: string;
  companyDomain?: string;
  jobTitle?: string;
  location?: string;
  primaryIndustry?: string;
  linkedinUrl?: string;
  [key: string]: any; // Allow additional custom fields
}

export interface ParseResult {
  success: boolean;
  data: LeadData[];
  errors: string[];
  warnings: string[];
  totalRows: number;
  validRows: number;
}

export class CSVParser {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly MAX_ROWS = 10000;

  /**
   * Parse CSV file and extract lead data
   */
  static async parseCSV(file: File): Promise<ParseResult> {
    const result: ParseResult = {
      success: false,
      data: [],
      errors: [],
      warnings: [],
      totalRows: 0,
      validRows: 0
    };

    try {
      // Validate file
      const fileValidation = this.validateFile(file);
      if (!fileValidation.isValid) {
        result.errors.push(...fileValidation.errors);
        return result;
      }

      // Read file content
      const content = await this.readFileContent(file);
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        result.errors.push('File is empty');
        return result;
      }

      result.totalRows = lines.length - 1; // Exclude header

      // Parse header
      const header = this.parseCSVLine(lines[0]);
      const columnMapping = this.mapColumns(header);

      if (!columnMapping.emailColumn) {
        result.errors.push('Email column not found. Required columns: email');
        return result;
      }

      // Parse data rows
      for (let i = 1; i < lines.length && i <= this.MAX_ROWS; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const rowData = this.parseCSVLine(line);
          const leadData = this.mapRowToLead(rowData, columnMapping, i + 1);
          
          if (leadData) {
            result.data.push(leadData);
            result.validRows++;
          }
        } catch (error) {
          result.warnings.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Invalid data'}`);
        }
      }

      if (result.validRows === 0) {
        result.errors.push('No valid leads found in CSV');
        return result;
      }

      result.success = true;
      
      if (result.warnings.length > 0) {
        result.warnings.unshift(`Successfully parsed ${result.validRows} of ${result.totalRows} rows`);
      }

      return result;

    } catch (error) {
      result.errors.push(`File parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Validate file before processing
   */
  private static validateFile(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!file) {
      errors.push('No file provided');
      return { isValid: false, errors };
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      errors.push('File must be a CSV file');
    }

    if (file.size > this.MAX_FILE_SIZE) {
      errors.push(`File size must be less than ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    if (file.size === 0) {
      errors.push('File is empty');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Read file content as text
   */
  private static readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Parse a single CSV line, handling quotes and commas
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        // Check for escaped quote
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // Skip the escaped quote
        } else {
          inQuotes = false;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
      i++;
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Map CSV columns to lead data fields
   */
  private static mapColumns(header: string[]): {
    emailColumn?: number;
    firstNameColumn?: number;
    lastNameColumn?: number;
    fullNameColumn?: number;
    companyColumn?: number;
    companyDomainColumn?: number;
    jobTitleColumn?: number;
    locationColumn?: number;
    primaryIndustryColumn?: number;
    linkedinUrlColumn?: number;
    customColumns: { [key: string]: number };
  } {
    const mapping: any = {
      customColumns: {}
    };

    header.forEach((col, index) => {
      const lowerCol = col.toLowerCase().trim();
      
      // Map standard columns with better matching for the CSV template format
      if (lowerCol.includes('email') || lowerCol.includes('e-mail') || lowerCol.includes('mail')) {
        mapping.emailColumn = index;
      } else if (lowerCol.includes('first') && lowerCol.includes('name') || lowerCol === 'firstname' || lowerCol === 'first name') {
        mapping.firstNameColumn = index;
      } else if (lowerCol.includes('last') && lowerCol.includes('name') || lowerCol === 'lastname' || lowerCol === 'last name') {
        mapping.lastNameColumn = index;
      } else if (lowerCol.includes('full') && lowerCol.includes('name') || lowerCol === 'fullname' || lowerCol === 'full name') {
        mapping.fullNameColumn = index;
      } else if (lowerCol.includes('company') && lowerCol.includes('domain') || lowerCol === 'company domain') {
        mapping.companyDomainColumn = index;
      } else if (lowerCol.includes('company') || lowerCol.includes('organization') || lowerCol.includes('business')) {
        mapping.companyColumn = index;
      } else if (lowerCol.includes('job') && lowerCol.includes('title') || lowerCol === 'job title' || lowerCol.includes('position')) {
        mapping.jobTitleColumn = index;
      } else if (lowerCol.includes('location') || lowerCol.includes('city') || lowerCol.includes('country')) {
        mapping.locationColumn = index;
      } else if (lowerCol.includes('primary') && lowerCol.includes('industry') || lowerCol === 'primary industry' || lowerCol.includes('industry')) {
        mapping.primaryIndustryColumn = index;
      } else if (lowerCol.includes('linkedin') || lowerCol.includes('profile')) {
        mapping.linkedinUrlColumn = index;
      } else {
        // Store as custom field
        mapping.customColumns[col] = index;
      }
    });

    return mapping;
  }

  /**
   * Map CSV row data to LeadData object
   */
  private static mapRowToLead(
    row: string[], 
    columnMapping: any, 
    rowNumber: number
  ): LeadData | null {
    const email = row[columnMapping.emailColumn!]?.trim();
    
    if (!email) {
      throw new Error('Missing email address');
    }

    if (!this.EMAIL_REGEX.test(email)) {
      throw new Error('Invalid email address format');
    }

    const leadData: LeadData = {
      email: email.toLowerCase()
    };

    // Map standard fields
    if (columnMapping.firstNameColumn !== undefined) {
      leadData.firstName = row[columnMapping.firstNameColumn]?.trim() || '';
    }

    if (columnMapping.lastNameColumn !== undefined) {
      leadData.lastName = row[columnMapping.lastNameColumn]?.trim() || '';
    }

    if (columnMapping.fullNameColumn !== undefined) {
      leadData.fullName = row[columnMapping.fullNameColumn]?.trim() || '';
    }

    if (columnMapping.companyColumn !== undefined) {
      leadData.company = row[columnMapping.companyColumn]?.trim() || '';
    }

    if (columnMapping.companyDomainColumn !== undefined) {
      leadData.companyDomain = row[columnMapping.companyDomainColumn]?.trim() || '';
    }

    if (columnMapping.jobTitleColumn !== undefined) {
      leadData.jobTitle = row[columnMapping.jobTitleColumn]?.trim() || '';
    }

    if (columnMapping.locationColumn !== undefined) {
      leadData.location = row[columnMapping.locationColumn]?.trim() || '';
    }

    if (columnMapping.primaryIndustryColumn !== undefined) {
      leadData.primaryIndustry = row[columnMapping.primaryIndustryColumn]?.trim() || '';
    }

    if (columnMapping.linkedinUrlColumn !== undefined) {
      leadData.linkedinUrl = row[columnMapping.linkedinUrlColumn]?.trim() || '';
    }

    // Map custom fields
    Object.entries(columnMapping.customColumns).forEach(([fieldName, columnIndex]) => {
      const value = row[columnIndex as number]?.trim();
      if (value) {
        leadData[fieldName] = value;
      }
    });

    return leadData;
  }

  /**
   * Generate CSV template for download
   */
  static generateTemplate(): string {
    const headers = ['email', 'firstName', 'lastName', 'company'];
    const sampleData = [
      ['john@example.com', 'John', 'Doe', 'Acme Corp'],
      ['jane@example.com', 'Jane', 'Smith', 'Tech Solutions'],
      ['bob@example.com', 'Bob', 'Johnson', 'Marketing Inc']
    ];

    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Download CSV template
   */
  static downloadTemplate(): void {
    const csvContent = this.generateTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'leads_template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}

export default CSVParser;