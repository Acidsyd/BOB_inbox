'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus,
  Ticket,
  Clock,
  MessageCircle,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  BarChart3
} from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

interface SupportTicket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category_id?: string;
  category_name?: string;
  category_color?: string;
  assigned_to_id?: string;
  assigned_to_name?: string;
  created_by_name: string;
  created_by_email: string;
  message_count: number;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

interface TicketStats {
  overall: {
    total_tickets: number;
    open_tickets: number;
    in_progress_tickets: number;
    resolved_tickets: number;
    closed_tickets: number;
    urgent_tickets: number;
    high_tickets: number;
    avg_resolution_hours: number;
  };
  byCategory: Array<{
    category_name: string;
    category_color: string;
    ticket_count: number;
  }>;
  dailyTrend: Array<{
    day: string;
    ticket_count: number;
  }>;
  responseTime: {
    avg_first_response_hours: number;
    median_first_response_hours: number;
  };
}

const SupportPage: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my-tickets');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  // Load tickets with current filters
  const loadTickets = async (resetPage = false) => {
    if (resetPage) setPage(1);
    setLoading(true);

    try {
      const queryParams = new URLSearchParams({
        page: resetPage ? '1' : page.toString(),
        limit: limit.toString(),
        sortBy: 'created_at',
        sortOrder: 'desc'
      });

      // Add filters
      if (selectedStatus) queryParams.append('status', selectedStatus);
      if (selectedPriority) queryParams.append('priority', selectedPriority);
      if (searchTerm) queryParams.append('search', searchTerm);

      const response = await fetch(`/api/support/tickets?${queryParams}`);
      const data = await response.json();

      if (response.ok) {
        setTickets(data.tickets);
        setTotal(data.pagination.total);
      } else {
        console.error('Failed to load tickets:', data.error);
      }
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStats = async () => {
    try {
      const response = await fetch('/api/support/stats?timeframe=30d');
      const data = await response.json();
      
      if (response.ok) {
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  useEffect(() => {
    loadTickets();
    loadStats();
  }, [page, selectedStatus, selectedPriority, searchTerm]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'waiting_response':
        return 'bg-orange-100 text-orange-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get priority icon
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Support Center</h1>
          <p className="text-gray-600 mt-1">
            Create and manage support tickets for your team
          </p>
        </div>
        
        <Button onClick={() => window.location.href = '/support/tickets/new'}>
          <Plus className="w-4 h-4 mr-2" />
          New Ticket
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Ticket className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">{stats.overall.total_tickets}</p>
                  <p className="text-xs text-gray-500">Total Tickets</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">{stats.overall.open_tickets}</p>
                  <p className="text-xs text-gray-500">Open Tickets</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">{stats.overall.resolved_tickets}</p>
                  <p className="text-xs text-gray-500">Resolved This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">
                    {Math.round(stats.responseTime.avg_first_response_hours || 0)}h
                  </p>
                  <p className="text-xs text-gray-500">Avg Response Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_response">Waiting Response</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            {(selectedStatus || selectedPriority || searchTerm) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedStatus('');
                  setSelectedPriority('');
                  setSearchTerm('');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle>Support Tickets</CardTitle>
          <p className="text-sm text-gray-500">
            Showing {tickets.length} of {total.toLocaleString()} tickets
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-500">Loading tickets...</span>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No support tickets found</p>
              <p className="text-sm text-gray-400 mb-4">
                Create your first support ticket to get started
              </p>
              <Button onClick={() => window.location.href = '/support/tickets/new'}>
                <Plus className="w-4 h-4 mr-2" />
                Create Ticket
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/support/tickets/${ticket.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-gray-900 truncate">
                          {ticket.title}
                        </h3>
                        {getPriorityIcon(ticket.priority)}
                      </div>
                      
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm text-gray-600">
                          #{ticket.ticket_number}
                        </span>
                        <Badge className={getStatusColor(ticket.status)}>
                          {ticket.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                        {ticket.category_name && (
                          <Badge
                            variant="outline"
                            style={{ 
                              backgroundColor: ticket.category_color + '20',
                              borderColor: ticket.category_color,
                              color: ticket.category_color
                            }}
                          >
                            {ticket.category_name}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {ticket.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          Created {formatDistanceToNow(parseISO(ticket.created_at), { addSuffix: true })}
                        </div>
                        
                        {ticket.message_count > 0 && (
                          <div className="flex items-center">
                            <MessageCircle className="w-3 h-3 mr-1" />
                            {ticket.message_count} message{ticket.message_count !== 1 ? 's' : ''}
                          </div>
                        )}
                        
                        {ticket.assigned_to_name && (
                          <div className="flex items-center">
                            <span>Assigned to {ticket.assigned_to_name}</span>
                          </div>
                        )}
                        
                        {ticket.last_message_at && (
                          <div className="flex items-center">
                            <span>Last activity {formatDistanceToNow(parseISO(ticket.last_message_at), { addSuffix: true })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats by Category */}
      {stats && stats.byCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tickets by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.byCategory.map((category) => (
                <div
                  key={category.category_name}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.category_color }}
                    />
                    <span className="font-medium">{category.category_name}</span>
                  </div>
                  <Badge variant="secondary">{category.ticket_count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SupportPage;