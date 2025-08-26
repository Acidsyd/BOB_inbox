/**
 * Unit tests for CSVUploader component
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import '@testing-library/jest-dom'
import CSVUploader from '@/components/leads/CSVUploader'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('CSVUploader Component', () => {
  const mockPush = jest.fn()
  const mockBack = jest.fn()

  beforeEach(() => {
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack
    })
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'mock-token')
      },
      writable: true
    })
    
    mockFetch.mockClear()
    mockPush.mockClear()
    mockBack.mockClear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render upload form correctly', () => {
    render(<CSVUploader />)
    
    expect(screen.getByText('Upload CSV File')).toBeInTheDocument()
    expect(screen.getByText('Drop your CSV file here, or')).toBeInTheDocument()
    expect(screen.getByText('browse')).toBeInTheDocument()
    expect(screen.getByLabelText('Lead List Name *')).toBeInTheDocument()
    expect(screen.getByLabelText('Description (optional)')).toBeInTheDocument()
  })

  it('should validate file type on selection', async () => {
    render(<CSVUploader />)
    
    const fileInput = screen.getByLabelText('browse').parentElement?.querySelector('input[type="file"]') as HTMLInputElement
    
    // Create a non-CSV file
    const txtFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
    
    fireEvent.change(fileInput, { target: { files: [txtFile] } })
    
    await waitFor(() => {
      expect(screen.getByText('Please select a valid CSV file')).toBeInTheDocument()
    })
  })

  it('should validate file size', async () => {
    render(<CSVUploader />)
    
    const fileInput = screen.getByLabelText('browse').parentElement?.querySelector('input[type="file"]') as HTMLInputElement
    
    // Create a large file (> 10MB)
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.csv', { type: 'text/csv' })
    
    fireEvent.change(fileInput, { target: { files: [largeFile] } })
    
    await waitFor(() => {
      expect(screen.getByText('File size must be less than 10MB')).toBeInTheDocument()
    })
  })

  it('should accept valid CSV file and auto-generate list name', async () => {
    render(<CSVUploader />)
    
    const fileInput = screen.getByLabelText('browse').parentElement?.querySelector('input[type="file"]') as HTMLInputElement
    const csvContent = 'Email,Name\njohn@example.com,John'
    const csvFile = new File([csvContent], 'test_file_name.csv', { type: 'text/csv' })
    
    // Mock preview API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        preview: [
          { original_data: { Email: 'john@example.com', Name: 'John' } }
        ],
        headers: ['Email', 'Name'],
        fieldMapping: {
          mapped: { Email: 'email', Name: 'first_name' },
          unmapped: [],
          suggestions: {}
        },
        stats: { estimatedTotalRows: 1, validPreviewRows: 1, previewErrors: [] }
      })
    })
    
    fireEvent.change(fileInput, { target: { files: [csvFile] } })
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test file name')).toBeInTheDocument()
      expect(screen.getByText('File Preview')).toBeInTheDocument()
    })
    
    expect(mockFetch).toHaveBeenCalledWith('/api/leads/lists/preview-csv', expect.any(Object))
  })

  it('should handle drag and drop file upload', async () => {
    render(<CSVUploader />)
    
    const dropZone = screen.getByText('Drop your CSV file here, or').parentElement as HTMLElement
    const csvContent = 'Email,Name\njohn@example.com,John'
    const csvFile = new File([csvContent], 'dropped.csv', { type: 'text/csv' })
    
    // Mock preview API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        preview: [],
        headers: ['Email', 'Name'],
        fieldMapping: { mapped: {}, unmapped: [], suggestions: {} },
        stats: { estimatedTotalRows: 1, validPreviewRows: 0, previewErrors: [] }
      })
    })
    
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [csvFile]
      }
    })
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Dropped')).toBeInTheDocument()
    })
  })

  it('should display field mapping preview', async () => {
    render(<CSVUploader />)
    
    const fileInput = screen.getByLabelText('browse').parentElement?.querySelector('input[type="file"]') as HTMLInputElement
    const csvFile = new File(['Email,Company Name\njohn@example.com,TechCorp'], 'test.csv', { type: 'text/csv' })
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        preview: [
          { original_data: { Email: 'john@example.com', 'Company Name': 'TechCorp' } }
        ],
        headers: ['Email', 'Company Name'],
        fieldMapping: {
          mapped: { Email: 'email', 'Company Name': 'company' },
          unmapped: [],
          suggestions: {}
        },
        stats: { estimatedTotalRows: 1, validPreviewRows: 1, previewErrors: [] }
      })
    })
    
    fireEvent.change(fileInput, { target: { files: [csvFile] } })
    
    await waitFor(() => {
      expect(screen.getByText('Mapped Fields:')).toBeInTheDocument()
      expect(screen.getByText('Email → email')).toBeInTheDocument()
      expect(screen.getByText('Company Name → company')).toBeInTheDocument()
    })
  })

  it('should handle upload success', async () => {
    render(<CSVUploader />)
    
    const fileInput = screen.getByLabelText('browse').parentElement?.querySelector('input[type="file"]') as HTMLInputElement
    const csvFile = new File(['Email\njohn@example.com'], 'test.csv', { type: 'text/csv' })
    
    // Mock preview
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        preview: [],
        headers: ['Email'],
        fieldMapping: { mapped: { Email: 'email' }, unmapped: [], suggestions: {} },
        stats: { estimatedTotalRows: 1, validPreviewRows: 0, previewErrors: [] }
      })
    })
    
    fireEvent.change(fileInput, { target: { files: [csvFile] } })
    
    await waitFor(() => {
      const listNameInput = screen.getByLabelText('Lead List Name *')
      fireEvent.change(listNameInput, { target: { value: 'Test List' } })
    })
    
    // Mock upload success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        leadList: {
          id: 'test-id',
          name: 'Test List',
          description: '',
          totalLeads: 1,
          createdAt: new Date().toISOString()
        },
        importResults: {
          totalProcessed: 1,
          imported: 1,
          duplicates: 0,
          errors: 0
        },
        details: {
          duplicateEmails: [],
          errors: [],
          stats: {}
        }
      })
    })
    
    const uploadButton = screen.getByText('Upload & Create List')
    fireEvent.click(uploadButton)
    
    await waitFor(() => {
      expect(screen.getByText('Upload Successful')).toBeInTheDocument()
      expect(screen.getByText('"Test List" created successfully')).toBeInTheDocument()
      expect(screen.getByText('1 leads imported')).toBeInTheDocument()
    })
  })

  it('should handle upload errors', async () => {
    render(<CSVUploader />)
    
    const fileInput = screen.getByLabelText('browse').parentElement?.querySelector('input[type="file"]') as HTMLInputElement
    const csvFile = new File(['Email\njohn@example.com'], 'test.csv', { type: 'text/csv' })
    
    // Mock preview
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        preview: [],
        headers: ['Email'],
        fieldMapping: { mapped: { Email: 'email' }, unmapped: [], suggestions: {} },
        stats: { estimatedTotalRows: 1, validPreviewRows: 0, previewErrors: [] }
      })
    })
    
    fireEvent.change(fileInput, { target: { files: [csvFile] } })
    
    await waitFor(() => {
      const listNameInput = screen.getByLabelText('Lead List Name *')
      fireEvent.change(listNameInput, { target: { value: 'Test List' } })
    })
    
    // Mock upload error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        error: 'Upload failed: Invalid CSV format'
      })
    })
    
    const uploadButton = screen.getByText('Upload & Create List')
    fireEvent.click(uploadButton)
    
    await waitFor(() => {
      expect(screen.getByText('Upload failed: Invalid CSV format')).toBeInTheDocument()
    })
  })

  it('should validate required fields', async () => {
    render(<CSVUploader />)
    
    const uploadButton = screen.getByText('Upload & Create List')
    fireEvent.click(uploadButton)
    
    await waitFor(() => {
      expect(screen.getByText('Please select a file and enter a list name')).toBeInTheDocument()
    })
  })

  it('should remove selected file', async () => {
    render(<CSVUploader />)
    
    const fileInput = screen.getByLabelText('browse').parentElement?.querySelector('input[type="file"]') as HTMLInputElement
    const csvFile = new File(['Email\njohn@example.com'], 'test.csv', { type: 'text/csv' })
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        preview: [],
        headers: ['Email'],
        fieldMapping: { mapped: {}, unmapped: [], suggestions: {} },
        stats: { estimatedTotalRows: 1, validPreviewRows: 0, previewErrors: [] }
      })
    })
    
    fireEvent.change(fileInput, { target: { files: [csvFile] } })
    
    await waitFor(() => {
      expect(screen.getByText('test.csv')).toBeInTheDocument()
    })
    
    const removeButton = screen.getByText('Remove')
    fireEvent.click(removeButton)
    
    expect(screen.queryByText('test.csv')).not.toBeInTheDocument()
    expect(screen.getByText('Drop your CSV file here, or')).toBeInTheDocument()
  })

  it('should navigate to lead list after successful upload', async () => {
    render(<CSVUploader />)
    
    const fileInput = screen.getByLabelText('browse').parentElement?.querySelector('input[type="file"]') as HTMLInputElement
    const csvFile = new File(['Email\njohn@example.com'], 'test.csv', { type: 'text/csv' })
    
    // Mock preview and upload
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          preview: [],
          headers: ['Email'],
          fieldMapping: { mapped: {}, unmapped: [], suggestions: {} },
          stats: { estimatedTotalRows: 1, validPreviewRows: 0, previewErrors: [] }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          leadList: { id: 'test-id', name: 'Test List' },
          importResults: { imported: 1, duplicates: 0, errors: 0 }
        })
      })
    
    fireEvent.change(fileInput, { target: { files: [csvFile] } })
    
    await waitFor(() => {
      const listNameInput = screen.getByLabelText('Lead List Name *')
      fireEvent.change(listNameInput, { target: { value: 'Test List' } })
    })
    
    const uploadButton = screen.getByText('Upload & Create List')
    fireEvent.click(uploadButton)
    
    await waitFor(() => {
      const viewButton = screen.getByText('View Lead List')
      fireEvent.click(viewButton)
    })
    
    expect(mockPush).toHaveBeenCalledWith('/leads/lists/test-id')
  })

  it('should handle preview API errors', async () => {
    render(<CSVUploader />)
    
    const fileInput = screen.getByLabelText('browse').parentElement?.querySelector('input[type="file"]') as HTMLInputElement
    const csvFile = new File(['Email\njohn@example.com'], 'test.csv', { type: 'text/csv' })
    
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Preview failed' })
    })
    
    fireEvent.change(fileInput, { target: { files: [csvFile] } })
    
    await waitFor(() => {
      expect(screen.getByText('Failed to preview CSV file')).toBeInTheDocument()
    })
  })

  it('should show upload progress during upload', async () => {
    render(<CSVUploader />)
    
    const fileInput = screen.getByLabelText('browse').parentElement?.querySelector('input[type="file"]') as HTMLInputElement
    const csvFile = new File(['Email\njohn@example.com'], 'test.csv', { type: 'text/csv' })
    
    // Mock preview
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        preview: [],
        headers: ['Email'],
        fieldMapping: { mapped: {}, unmapped: [], suggestions: {} },
        stats: { estimatedTotalRows: 1, validPreviewRows: 0, previewErrors: [] }
      })
    })
    
    fireEvent.change(fileInput, { target: { files: [csvFile] } })
    
    await waitFor(() => {
      const listNameInput = screen.getByLabelText('Lead List Name *')
      fireEvent.change(listNameInput, { target: { value: 'Test List' } })
    })
    
    // Mock slow upload
    mockFetch.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    )
    
    const uploadButton = screen.getByText('Upload & Create List')
    fireEvent.click(uploadButton)
    
    // Should show progress
    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeInTheDocument()
      expect(screen.getByText(/Uploading and processing CSV/)).toBeInTheDocument()
    })
  })
})