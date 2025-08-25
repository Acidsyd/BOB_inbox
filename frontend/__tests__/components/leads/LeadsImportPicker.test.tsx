import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import LeadsImportPicker from '@/components/leads/LeadsImportPicker';
import { LeadImport, ImportStatus } from '@/types/spreadsheet';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, size, variant, className, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`button ${size} ${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ onChange, value, placeholder, className, ...props }: any) => (
    <input 
      onChange={onChange}
      value={value}
      placeholder={placeholder}
      className={`input ${className}`}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, onClick }: any) => (
    <div className={`card ${className}`} onClick={onClick}>{children}</div>
  ),
  CardContent: ({ children, className }: any) => <div className={`card-content ${className}`}>{children}</div>,
  CardHeader: ({ children }: any) => <div className="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <div className={`card-title ${className}`}>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => (
    <span className={`badge ${className}`}>{children}</span>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  const mockIcon = ({ className }: { className?: string }) => <div className={`icon ${className}`} />;
  return {
    Upload: mockIcon,
    FileText: mockIcon,
    Clock: mockIcon,
    CheckCircle: mockIcon,
    XCircle: mockIcon,
    AlertCircle: mockIcon,
    Search: mockIcon,
    Filter: mockIcon,
    Calendar: mockIcon,
    BarChart3: mockIcon,
    Download: mockIcon,
    Eye: mockIcon,
    MoreHorizontal: mockIcon,
    RefreshCw: mockIcon,
  };
});

// Mock utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

// Test data
const mockImports: LeadImport[] = [
  {
    id: 'import-1',
    importName: 'Q4 Prospects',
    fileName: 'q4_prospects.csv',
    fileSize: 1024000,
    status: 'completed',
    organizationId: 'org-1',
    userId: 'user-1',
    createdAt: '2023-12-01T10:00:00Z',
    updatedAt: '2023-12-01T10:30:00Z',
    leadsTotal: 1000,
    leadsImported: 950,
    leadsSkipped: 30,
    leadsFailed: 20,
    progressPercentage: 100,
    mappingConfig: {}
  },
  {
    id: 'import-2',
    importName: 'Tech Leads Export',
    fileName: 'tech_leads.xlsx',
    fileSize: 2048000,
    status: 'processing',
    organizationId: 'org-1',
    userId: 'user-1',
    createdAt: '2023-12-02T14:30:00Z',
    updatedAt: '2023-12-02T15:00:00Z',
    leadsTotal: 500,
    leadsImported: 250,
    leadsSkipped: 0,
    leadsFailed: 0,
    progressPercentage: 50,
    mappingConfig: {}
  },
  {
    id: 'import-3',
    importName: 'Failed Import Test',
    fileName: 'bad_data.csv',
    fileSize: 512000,
    status: 'failed',
    organizationId: 'org-1',
    userId: 'user-1',
    createdAt: '2023-12-03T09:15:00Z',
    updatedAt: '2023-12-03T09:20:00Z',
    leadsTotal: 100,
    leadsImported: 0,
    leadsSkipped: 0,
    leadsFailed: 100,
    progressPercentage: 0,
    errorMessage: 'Invalid CSV format: missing required columns',
    mappingConfig: {}
  },
  {
    id: 'import-4',
    importName: 'Pending Upload',
    fileName: 'new_leads.csv',
    fileSize: 256000,
    status: 'pending',
    organizationId: 'org-1',
    userId: 'user-1',
    createdAt: '2023-12-04T16:45:00Z',
    updatedAt: '2023-12-04T16:45:00Z',
    leadsTotal: 200,
    leadsImported: 0,
    leadsSkipped: 0,
    leadsFailed: 0,
    progressPercentage: 0,
    mappingConfig: {}
  }
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('LeadsImportPicker', () => {
  const mockOnImportSelected = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        imports: mockImports,
        total: mockImports.length,
        page: 1,
        totalPages: 1,
        hasMore: false
      }),
    } as Response);
  });

  describe('Basic Rendering', () => {
    it('renders header and description', async () => {
      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Lead Imports')).toBeInTheDocument();
      expect(screen.getByText('Select a lead import to view in the spreadsheet')).toBeInTheDocument();
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    it('renders search and filter controls', async () => {
      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByPlaceholderText('Search imports by name or filename...')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Status')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Newest First')).toBeInTheDocument();
    });

    it('shows loading state initially', () => {
      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Loading imports...')).toBeInTheDocument();
    });

    it('renders summary statistics', async () => {
      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Total Imports')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('Processing')).toBeInTheDocument();
        expect(screen.getByText('Failed')).toBeInTheDocument();
      });

      // Check counts
      await waitFor(() => {
        expect(screen.getByText('4')).toBeInTheDocument(); // Total
        expect(screen.getByText('1')).toBeInTheDocument(); // Completed, Processing, Failed
      });
    });
  });

  describe('Import List', () => {
    it('displays all imports with correct information', async () => {
      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Q4 Prospects')).toBeInTheDocument();
        expect(screen.getByText('Tech Leads Export')).toBeInTheDocument();
        expect(screen.getByText('Failed Import Test')).toBeInTheDocument();
        expect(screen.getByText('Pending Upload')).toBeInTheDocument();
      });

      // Check file info
      expect(screen.getByText('q4_prospects.csv • 1000 KB')).toBeInTheDocument();
      expect(screen.getByText('tech_leads.xlsx • 2 MB')).toBeInTheDocument();

      // Check status badges
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Processing')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('shows correct stats for each import', async () => {
      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        // Completed import stats
        expect(screen.getByText('950 leads imported')).toBeInTheDocument();
        
        // Processing import progress
        expect(screen.getByText('50% complete')).toBeInTheDocument();
        
        // Failed import total
        expect(screen.getByText('100 leads total')).toBeInTheDocument();
      });
    });

    it('shows progress bar for processing imports', async () => {
      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const progressBars = document.querySelectorAll('.bg-blue-600');
        expect(progressBars.length).toBeGreaterThan(0);
      });
    });

    it('shows error message for failed imports', async () => {
      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Invalid CSV format: missing required columns')).toBeInTheDocument();
      });
    });

    it('shows detailed results for completed imports', async () => {
      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        // Check results breakdown
        expect(screen.getByText('950')).toBeInTheDocument(); // Imported
        expect(screen.getByText('30')).toBeInTheDocument(); // Skipped  
        expect(screen.getByText('20')).toBeInTheDocument(); // Failed
        expect(screen.getByText('1000')).toBeInTheDocument(); // Total
      });
    });
  });

  describe('Import Selection', () => {
    it('calls onImportSelected when import is clicked', async () => {
      const user = userEvent.setup();
      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Q4 Prospects')).toBeInTheDocument();
      });

      const importCard = screen.getByText('Q4 Prospects').closest('.card');
      if (importCard) {
        await user.click(importCard);
        expect(mockOnImportSelected).toHaveBeenCalledWith('import-1');
      }
    });

    it('highlights selected import', async () => {
      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          selectedImportId="import-1"
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const selectedCard = screen.getByText('Q4 Prospects').closest('.card');
        expect(selectedCard).toHaveClass('ring-2', 'ring-purple-500', 'bg-purple-50');
      });
    });
  });

  describe('Search and Filtering', () => {
    it('searches imports by name', async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation((url) => {
        const urlObj = new URL(url as string, 'http://localhost');
        const search = urlObj.searchParams.get('search');
        const filteredImports = search 
          ? mockImports.filter(imp => imp.importName.toLowerCase().includes(search.toLowerCase()))
          : mockImports;
          
        return Promise.resolve({
          ok: true,
          json: async () => ({
            imports: filteredImports,
            total: filteredImports.length,
            page: 1,
            totalPages: 1,
            hasMore: false
          })
        } as Response);
      });

      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      const searchInput = screen.getByPlaceholderText('Search imports by name or filename...');
      await user.type(searchInput, 'Q4');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('search=Q4'),
          expect.any(Object)
        );
      });
    });

    it('filters imports by status', async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation((url) => {
        const urlObj = new URL(url as string, 'http://localhost');
        const status = urlObj.searchParams.get('status');
        const filteredImports = status 
          ? mockImports.filter(imp => imp.status === status)
          : mockImports;
          
        return Promise.resolve({
          ok: true,
          json: async () => ({
            imports: filteredImports,
            total: filteredImports.length,
            page: 1,
            totalPages: 1,
            hasMore: false
          })
        } as Response);
      });

      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      const statusSelect = screen.getByDisplayValue('All Status');
      await user.selectOptions(statusSelect, 'completed');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('status=completed'),
          expect.any(Object)
        );
      });
    });

    it('sorts imports by different criteria', async () => {
      const user = userEvent.setup();
      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      const sortSelect = screen.getByDisplayValue('Newest First');
      await user.selectOptions(sortSelect, 'import_name-asc');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('sortBy=import_name&sortOrder=asc'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error state when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Error Loading Imports')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('retries loading when Try Again is clicked', async () => {
      const user = userEvent.setup();
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            imports: mockImports,
            total: mockImports.length,
            page: 1,
            totalPages: 1,
            hasMore: false
          })
        } as Response);

      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Try Again');
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Q4 Prospects')).toBeInTheDocument();
      });
    });

    it('handles HTTP errors correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      } as Response);

      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Error Loading Imports')).toBeInTheDocument();
        expect(screen.getByText('HTTP error! status: 500')).toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no imports exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          imports: [],
          total: 0,
          page: 1,
          totalPages: 1,
          hasMore: false
        })
      } as Response);

      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('No Imports Found')).toBeInTheDocument();
        expect(screen.getByText('Get started by importing your first lead list.')).toBeInTheDocument();
        expect(screen.getByText('Import Leads')).toBeInTheDocument();
      });
    });

    it('shows filtered empty state when no results match filters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          imports: [],
          total: 0,
          page: 1,
          totalPages: 1,
          hasMore: false
        })
      } as Response);

      const user = userEvent.setup();
      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      // Add search term
      const searchInput = screen.getByPlaceholderText('Search imports by name or filename...');
      await user.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText('No Imports Found')).toBeInTheDocument();
        expect(screen.getByText('No imports match your current filters. Try adjusting your search or filters.')).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('shows Load More button when there are more pages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          imports: mockImports.slice(0, 2),
          total: 4,
          page: 1,
          totalPages: 2,
          hasMore: true
        })
      } as Response);

      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Load More')).toBeInTheDocument();
      });
    });

    it('loads more imports when Load More is clicked', async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            imports: mockImports.slice(0, 2),
            total: 4,
            page: 1,
            totalPages: 2,
            hasMore: true
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            imports: mockImports.slice(2, 4),
            total: 4,
            page: 2,
            totalPages: 2,
            hasMore: false
          })
        } as Response);

      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Load More')).toBeInTheDocument();
      });

      const loadMoreButton = screen.getByText('Load More');
      await user.click(loadMoreButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('page=2'),
          expect.any(Object)
        );
      });
    });

    it('hides Load More button when there are no more pages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          imports: mockImports,
          total: 4,
          page: 1,
          totalPages: 1,
          hasMore: false
        })
      } as Response);

      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.queryByText('Load More')).not.toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('refetches data when refresh button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Q4 Prospects')).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      // Should trigger another API call
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('File Size Formatting', () => {
    it('formats file sizes correctly', async () => {
      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('q4_prospects.csv • 1000 KB')).toBeInTheDocument();
        expect(screen.getByText('tech_leads.xlsx • 2 MB')).toBeInTheDocument();
        expect(screen.getByText('bad_data.csv • 500 KB')).toBeInTheDocument();
        expect(screen.getByText('new_leads.csv • 250 KB')).toBeInTheDocument();
      });
    });
  });

  describe('Date Formatting', () => {
    it('formats dates correctly', async () => {
      // Mock date formatting
      const mockDate = new Date('2023-12-01T10:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        // Check that dates are displayed (exact format may vary by locale)
        expect(screen.getByText(/12\/1\/2023/)).toBeInTheDocument();
      });
    });
  });

  describe('Status Badge Colors', () => {
    it('applies correct styling for each status', async () => {
      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const completedBadge = screen.getByText('Completed').closest('.badge');
        expect(completedBadge).toHaveClass('bg-green-100', 'text-green-800');

        const processingBadge = screen.getByText('Processing').closest('.badge');
        expect(processingBadge).toHaveClass('bg-blue-100', 'text-blue-800');

        const failedBadge = screen.getByText('Failed').closest('.badge');
        expect(failedBadge).toHaveClass('bg-red-100', 'text-red-800');

        const pendingBadge = screen.getByText('Pending').closest('.badge');
        expect(pendingBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper form controls and labels', async () => {
      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toBeInTheDocument();

      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBe(2); // Status filter and sort
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <LeadsImportPicker
          onImportSelected={mockOnImportSelected}
          organizationId="org-1"
        />,
        { wrapper: createWrapper() }
      );

      // Tab to search input
      await user.tab();
      
      const searchInput = screen.getByPlaceholderText('Search imports by name or filename...');
      expect(searchInput).toHaveFocus();
    });
  });
});