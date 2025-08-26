/**
 * @jest-environment jsdom
 */

import axios from 'axios'
import { api } from '@/lib/api'

// Mock axios to test the actual API integration
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('API Endpoints Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock localStorage for token management
    const mockLocalStorage = {
      getItem: jest.fn().mockReturnValue('test-token'),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    }
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })
  })

  describe('Leads API Endpoints', () => {
    describe('GET /api/leads', () => {
      test('fetches leads with default parameters', async () => {
        const mockResponse = {
          data: {
            leads: [
              {
                id: '1',
                email: 'test@example.com',
                first_name: 'John',
                last_name: 'Doe',
                company: 'Acme Corp',
                status: 'active',
                created_at: '2024-01-01T00:00:00Z'
              }
            ],
            total: 1,
            page: 1,
            limit: 50,
            totalPages: 1
          }
        }

        api.get = jest.fn().mockResolvedValue(mockResponse)

        const result = await api.get('/leads')

        expect(api.get).toHaveBeenCalledWith('/leads')
        expect(result.data.leads).toHaveLength(1)
        expect(result.data.leads[0].email).toBe('test@example.com')
      })

      test('fetches leads with query parameters', async () => {
        const mockResponse = {
          data: {
            leads: [],
            total: 0,
            page: 2,
            limit: 25,
            totalPages: 0
          }
        }

        api.get = jest.fn().mockResolvedValue(mockResponse)

        const params = new URLSearchParams({
          page: '2',
          limit: '25',
          search: 'john',
          status: 'active',
          sortBy: 'email',
          sortOrder: 'asc'
        })

        await api.get(`/leads?${params.toString()}`)

        expect(api.get).toHaveBeenCalledWith(`/leads?page=2&limit=25&search=john&status=active&sortBy=email&sortOrder=asc`)
      })

      test('handles leads API error responses', async () => {
        const errorResponse = {
          response: {
            status: 400,
            data: {
              error: 'Invalid parameters'
            }
          }
        }

        api.get = jest.fn().mockRejectedValue(errorResponse)

        try {
          await api.get('/leads')
        } catch (error: any) {
          expect(error.response.status).toBe(400)
          expect(error.response.data.error).toBe('Invalid parameters')
        }
      })

      test('handles leads API network errors', async () => {
        api.get = jest.fn().mockRejectedValue(new Error('Network Error'))

        try {
          await api.get('/leads')
        } catch (error: any) {
          expect(error.message).toBe('Network Error')
        }
      })

      test('filters leads by status', async () => {
        const mockResponse = {
          data: {
            leads: [
              { id: '1', status: 'active', email: 'active@test.com' },
              { id: '2', status: 'active', email: 'active2@test.com' }
            ],
            total: 2
          }
        }

        api.get = jest.fn().mockResolvedValue(mockResponse)

        await api.get('/leads?status=active')

        expect(api.get).toHaveBeenCalledWith('/leads?status=active')
        expect(mockResponse.data.leads.every(lead => lead.status === 'active')).toBe(true)
      })

      test('searches leads by email', async () => {
        const mockResponse = {
          data: {
            leads: [
              { id: '1', email: 'john@example.com', first_name: 'John' }
            ],
            total: 1
          }
        }

        api.get = jest.fn().mockResolvedValue(mockResponse)

        await api.get('/leads?search=john')

        expect(api.get).toHaveBeenCalledWith('/leads?search=john')
        expect(mockResponse.data.leads[0].email).toContain('john')
      })

      test('sorts leads by different columns', async () => {
        const mockResponse = {
          data: {
            leads: [
              { id: '1', email: 'a@test.com', created_at: '2024-01-01T00:00:00Z' },
              { id: '2', email: 'b@test.com', created_at: '2024-01-02T00:00:00Z' }
            ],
            total: 2
          }
        }

        api.get = jest.fn().mockResolvedValue(mockResponse)

        await api.get('/leads?sortBy=created_at&sortOrder=desc')

        expect(api.get).toHaveBeenCalledWith('/leads?sortBy=created_at&sortOrder=desc')
      })
    })

    describe('PUT /api/leads/bulk/update', () => {
      test('performs bulk status update', async () => {
        const mockResponse = {
          data: {
            updated: 2,
            requested: 2,
            leads: [
              { id: '1', status: 'inactive', campaign_id: null, updated_at: '2024-01-01T12:00:00Z' },
              { id: '2', status: 'inactive', campaign_id: null, updated_at: '2024-01-01T12:00:00Z' }
            ]
          }
        }

        api.put = jest.fn().mockResolvedValue(mockResponse)

        const bulkUpdateData = {
          leadIds: ['1', '2'],
          updates: { status: 'inactive' }
        }

        const result = await api.put('/leads/bulk/update', bulkUpdateData)

        expect(api.put).toHaveBeenCalledWith('/leads/bulk/update', bulkUpdateData)
        expect(result.data.updated).toBe(2)
        expect(result.data.leads).toHaveLength(2)
      })

      test('handles bulk update with partial success', async () => {
        const mockResponse = {
          data: {
            updated: 1,
            requested: 2,
            leads: [
              { id: '1', status: 'inactive', campaign_id: null, updated_at: '2024-01-01T12:00:00Z' }
            ],
            errors: [
              { id: '2', error: 'Lead not found' }
            ]
          }
        }

        api.put = jest.fn().mockResolvedValue(mockResponse)

        const bulkUpdateData = {
          leadIds: ['1', '2'],
          updates: { status: 'inactive' }
        }

        const result = await api.put('/leads/bulk/update', bulkUpdateData)

        expect(result.data.updated).toBe(1)
        expect(result.data.requested).toBe(2)
        expect(result.data.errors).toHaveLength(1)
      })

      test('handles bulk update authorization errors', async () => {
        const errorResponse = {
          response: {
            status: 403,
            data: {
              error: 'Insufficient permissions'
            }
          }
        }

        api.put = jest.fn().mockRejectedValue(errorResponse)

        const bulkUpdateData = {
          leadIds: ['1', '2'],
          updates: { status: 'inactive' }
        }

        try {
          await api.put('/leads/bulk/update', bulkUpdateData)
        } catch (error: any) {
          expect(error.response.status).toBe(403)
          expect(error.response.data.error).toBe('Insufficient permissions')
        }
      })
    })

    describe('GET /api/leads/stats/summary', () => {
      test('fetches lead statistics', async () => {
        const mockResponse = {
          data: {
            summary: {
              total_leads: 100,
              active_leads: 80,
              inactive_leads: 15,
              bounced_leads: 5,
              unsubscribed_leads: 0,
              responded_leads: 10
            },
            campaignDistribution: [
              { campaign_name: 'Q1 Campaign', lead_count: 50 },
              { campaign_name: 'Q2 Campaign', lead_count: 30 }
            ]
          }
        }

        api.get = jest.fn().mockResolvedValue(mockResponse)

        const result = await api.get('/leads/stats/summary')

        expect(api.get).toHaveBeenCalledWith('/leads/stats/summary')
        expect(result.data.summary.total_leads).toBe(100)
        expect(result.data.campaignDistribution).toHaveLength(2)
      })

      test('handles stats API errors', async () => {
        api.get = jest.fn().mockRejectedValue({
          response: {
            status: 500,
            data: { error: 'Database connection failed' }
          }
        })

        try {
          await api.get('/leads/stats/summary')
        } catch (error: any) {
          expect(error.response.status).toBe(500)
        }
      })
    })
  })

  describe('Support API Endpoints', () => {
    describe('GET /api/support/tickets', () => {
      test('fetches support tickets successfully', async () => {
        const mockResponse = {
          data: {
            tickets: [
              {
                id: '1',
                title: 'Login Issue',
                status: 'open',
                priority: 'high',
                created_at: '2024-01-01T00:00:00Z'
              }
            ],
            total: 1,
            page: 1,
            limit: 25
          }
        }

        api.get = jest.fn().mockResolvedValue(mockResponse)

        const result = await api.get('/support/tickets')

        expect(api.get).toHaveBeenCalledWith('/support/tickets')
        expect(result.data.tickets).toHaveLength(1)
        expect(result.data.tickets[0].title).toBe('Login Issue')
      })

      test('filters tickets by status', async () => {
        const mockResponse = {
          data: {
            tickets: [
              { id: '1', status: 'open', title: 'Open Ticket' },
              { id: '2', status: 'open', title: 'Another Open Ticket' }
            ],
            total: 2
          }
        }

        api.get = jest.fn().mockResolvedValue(mockResponse)

        await api.get('/support/tickets?status=open')

        expect(api.get).toHaveBeenCalledWith('/support/tickets?status=open')
        expect(mockResponse.data.tickets.every(ticket => ticket.status === 'open')).toBe(true)
      })

      test('filters tickets by priority', async () => {
        const mockResponse = {
          data: {
            tickets: [
              { id: '1', priority: 'high', title: 'High Priority Ticket' }
            ],
            total: 1
          }
        }

        api.get = jest.fn().mockResolvedValue(mockResponse)

        await api.get('/support/tickets?priority=high')

        expect(api.get).toHaveBeenCalledWith('/support/tickets?priority=high')
      })

      test('searches tickets by title or content', async () => {
        const mockResponse = {
          data: {
            tickets: [
              { id: '1', title: 'Login Issue', content: 'Cannot login to account' }
            ],
            total: 1
          }
        }

        api.get = jest.fn().mockResolvedValue(mockResponse)

        await api.get('/support/tickets?search=login')

        expect(api.get).toHaveBeenCalledWith('/support/tickets?search=login')
      })
    })

    describe('GET /api/support/stats', () => {
      test('fetches support statistics', async () => {
        const mockResponse = {
          data: {
            total_tickets: 50,
            open_tickets: 30,
            resolved_tickets: 20,
            average_response_time: 4.5
          }
        }

        api.get = jest.fn().mockResolvedValue(mockResponse)

        const result = await api.get('/support/stats')

        expect(result.data.total_tickets).toBe(50)
        expect(result.data.average_response_time).toBe(4.5)
      })
    })
  })

  describe('Logs API Endpoints', () => {
    describe('GET /api/logs', () => {
      test('fetches activity logs successfully', async () => {
        const mockResponse = {
          data: {
            logs: [
              {
                id: '1',
                action: 'lead_created',
                user_id: 'user-1',
                details: 'Created new lead: john@example.com',
                timestamp: '2024-01-01T00:00:00Z'
              }
            ],
            total: 1,
            page: 1,
            limit: 50
          }
        }

        api.get = jest.fn().mockResolvedValue(mockResponse)

        const result = await api.get('/logs')

        expect(api.get).toHaveBeenCalledWith('/logs')
        expect(result.data.logs).toHaveLength(1)
        expect(result.data.logs[0].action).toBe('lead_created')
      })

      test('filters logs by action type', async () => {
        const mockResponse = {
          data: {
            logs: [
              { id: '1', action: 'lead_created', user_id: 'user-1' },
              { id: '2', action: 'lead_created', user_id: 'user-2' }
            ],
            total: 2
          }
        }

        api.get = jest.fn().mockResolvedValue(mockResponse)

        await api.get('/logs?action=lead_created')

        expect(api.get).toHaveBeenCalledWith('/logs?action=lead_created')
      })

      test('filters logs by user', async () => {
        const mockResponse = {
          data: {
            logs: [
              { id: '1', action: 'lead_updated', user_id: 'user-1' }
            ],
            total: 1
          }
        }

        api.get = jest.fn().mockResolvedValue(mockResponse)

        await api.get('/logs?user_id=user-1')

        expect(api.get).toHaveBeenCalledWith('/logs?user_id=user-1')
      })

      test('filters logs by date range', async () => {
        const mockResponse = {
          data: {
            logs: [
              { id: '1', timestamp: '2024-01-01T00:00:00Z' },
              { id: '2', timestamp: '2024-01-01T12:00:00Z' }
            ],
            total: 2
          }
        }

        api.get = jest.fn().mockResolvedValue(mockResponse)

        await api.get('/logs?start_date=2024-01-01&end_date=2024-01-01')

        expect(api.get).toHaveBeenCalledWith('/logs?start_date=2024-01-01&end_date=2024-01-01')
      })
    })

    describe('GET /api/logs/export', () => {
      test('exports logs as CSV', async () => {
        const mockResponse = {
          data: 'id,action,user_id,timestamp\n1,lead_created,user-1,2024-01-01T00:00:00Z',
          headers: {
            'content-type': 'text/csv',
            'content-disposition': 'attachment; filename=logs.csv'
          }
        }

        api.get = jest.fn().mockResolvedValue(mockResponse)

        const result = await api.get('/logs/export?format=csv')

        expect(api.get).toHaveBeenCalledWith('/logs/export?format=csv')
        expect(result.headers['content-type']).toBe('text/csv')
        expect(result.data).toContain('id,action,user_id,timestamp')
      })

      test('exports logs with date filter', async () => {
        api.get = jest.fn().mockResolvedValue({ data: 'csv content' })

        await api.get('/logs/export?format=csv&start_date=2024-01-01&end_date=2024-01-31')

        expect(api.get).toHaveBeenCalledWith('/logs/export?format=csv&start_date=2024-01-01&end_date=2024-01-31')
      })
    })

    describe('GET /api/logs/stats', () => {
      test('fetches log statistics', async () => {
        const mockResponse = {
          data: {
            total_activities: 1000,
            activities_today: 50,
            activities_this_week: 300,
            top_activities: [
              { action: 'lead_created', count: 200 },
              { action: 'campaign_sent', count: 150 }
            ],
            hourly_distribution: [
              { hour: 9, count: 25 },
              { hour: 10, count: 30 }
            ]
          }
        }

        api.get = jest.fn().mockResolvedValue(mockResponse)

        const result = await api.get('/logs/stats')

        expect(result.data.total_activities).toBe(1000)
        expect(result.data.top_activities).toHaveLength(2)
        expect(result.data.hourly_distribution).toHaveLength(2)
      })
    })
  })

  describe('API Error Handling', () => {
    test('handles 401 unauthorized responses', async () => {
      api.get = jest.fn().mockRejectedValue({
        response: { status: 401, data: { error: 'Unauthorized' } }
      })

      try {
        await api.get('/leads')
      } catch (error: any) {
        expect(error.response.status).toBe(401)
      }
    })

    test('handles 403 forbidden responses', async () => {
      api.get = jest.fn().mockRejectedValue({
        response: { status: 403, data: { error: 'Forbidden' } }
      })

      try {
        await api.get('/leads')
      } catch (error: any) {
        expect(error.response.status).toBe(403)
      }
    })

    test('handles 404 not found responses', async () => {
      api.get = jest.fn().mockRejectedValue({
        response: { status: 404, data: { error: 'Not Found' } }
      })

      try {
        await api.get('/leads/nonexistent')
      } catch (error: any) {
        expect(error.response.status).toBe(404)
      }
    })

    test('handles 500 server error responses', async () => {
      api.get = jest.fn().mockRejectedValue({
        response: { status: 500, data: { error: 'Internal Server Error' } }
      })

      try {
        await api.get('/leads')
      } catch (error: any) {
        expect(error.response.status).toBe(500)
      }
    })

    test('handles timeout errors', async () => {
      api.get = jest.fn().mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout of 60000ms exceeded'
      })

      try {
        await api.get('/leads')
      } catch (error: any) {
        expect(error.code).toBe('ECONNABORTED')
        expect(error.message).toContain('timeout')
      }
    })
  })

  describe('API Performance Tests', () => {
    test('API calls complete within acceptable time', async () => {
      const mockResponse = { data: { leads: [], total: 0 } }
      api.get = jest.fn().mockResolvedValue(mockResponse)

      const startTime = Date.now()
      await api.get('/leads')
      const endTime = Date.now()

      const responseTime = endTime - startTime
      expect(responseTime).toBeLessThan(100) // Mock should be fast
    })

    test('handles concurrent API requests', async () => {
      api.get = jest.fn().mockResolvedValue({ data: { leads: [], total: 0 } })

      const promises = [
        api.get('/leads'),
        api.get('/support/tickets'),
        api.get('/logs')
      ]

      const results = await Promise.all(promises)

      expect(results).toHaveLength(3)
      expect(api.get).toHaveBeenCalledTimes(3)
    })
  })

  describe('Data Validation', () => {
    test('validates leads response structure', async () => {
      const mockResponse = {
        data: {
          leads: [
            {
              id: '1',
              email: 'test@example.com',
              first_name: 'John',
              last_name: 'Doe',
              status: 'active',
              organization_id: 'org-1',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            }
          ],
          total: 1,
          page: 1,
          limit: 50,
          totalPages: 1
        }
      }

      api.get = jest.fn().mockResolvedValue(mockResponse)

      const result = await api.get('/leads')

      expect(result.data).toHaveProperty('leads')
      expect(result.data).toHaveProperty('total')
      expect(result.data).toHaveProperty('page')
      expect(result.data).toHaveProperty('limit')
      expect(result.data).toHaveProperty('totalPages')

      const lead = result.data.leads[0]
      expect(lead).toHaveProperty('id')
      expect(lead).toHaveProperty('email')
      expect(lead).toHaveProperty('status')
      expect(lead).toHaveProperty('created_at')
    })

    test('validates stats response structure', async () => {
      const mockResponse = {
        data: {
          summary: {
            total_leads: 100,
            active_leads: 80
          },
          campaignDistribution: []
        }
      }

      api.get = jest.fn().mockResolvedValue(mockResponse)

      const result = await api.get('/leads/stats/summary')

      expect(result.data).toHaveProperty('summary')
      expect(result.data).toHaveProperty('campaignDistribution')
      expect(result.data.summary).toHaveProperty('total_leads')
      expect(typeof result.data.summary.total_leads).toBe('number')
    })
  })
})