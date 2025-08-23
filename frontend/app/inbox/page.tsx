'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Inbox as InboxIcon, 
  Search, 
  Filter, 
  Reply, 
  Archive,
  Star,
  MoreHorizontal,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react'
import { useState } from 'react'

function InboxContent() {
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Mock inbox data
  const conversations = [
    {
      id: '1',
      contact: 'John Smith',
      email: 'john@techcorp.com',
      company: 'TechCorp',
      subject: 'Re: Partnership Opportunity',
      preview: 'Thanks for reaching out! I\'d be interested in learning more about...',
      timestamp: '2 hours ago',
      status: 'interested',
      unread: true,
      campaign: 'Q1 Outbound'
    },
    {
      id: '2',
      contact: 'Sarah Johnson',
      email: 'sarah@startup.io',
      company: 'Startup.io',
      subject: 'Re: Quick question about your stack',
      preview: 'Not interested at this time, but thanks for thinking of us.',
      timestamp: '5 hours ago',
      status: 'not_interested',
      unread: false,
      campaign: 'Tech Companies'
    },
    {
      id: '3',
      contact: 'Mike Chen',
      email: 'mike@growthlab.com',
      company: 'GrowthLab',
      subject: 'Out of office',
      preview: 'I will be out of the office until next Monday...',
      timestamp: '1 day ago',
      status: 'auto_reply',
      unread: false,
      campaign: 'Q1 Outbound'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'interested': return 'bg-green-100 text-green-800'
      case 'not_interested': return 'bg-red-100 text-red-800'
      case 'auto_reply': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'interested': return <CheckCircle className="h-4 w-4" />
      case 'not_interested': return <AlertCircle className="h-4 w-4" />
      case 'auto_reply': return <Clock className="h-4 w-4" />
      default: return <InboxIcon className="h-4 w-4" />
    }
  }

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.company.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filter === 'all' || 
                         (filter === 'unread' && conv.unread) ||
                         (filter === 'interested' && conv.status === 'interested') ||
                         (filter === 'not_interested' && conv.status === 'not_interested')
    return matchesSearch && matchesFilter
  })

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Unified Inbox</h1>
          <p className="text-gray-600">Manage all your campaign replies in one place</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Archive className="h-4 w-4 mr-2" />
            Archive All Read
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <InboxIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">{conversations.length}</p>
                <p className="text-sm text-gray-600">Total Replies</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">
                  {conversations.filter(c => c.status === 'interested').length}
                </p>
                <p className="text-sm text-gray-600">Interested</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">
                  {conversations.filter(c => c.status === 'not_interested').length}
                </p>
                <p className="text-sm text-gray-600">Not Interested</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">
                  {conversations.filter(c => c.unread).length}
                </p>
                <p className="text-sm text-gray-600">Unread</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            onClick={() => setFilter('unread')}
            size="sm"
          >
            Unread
          </Button>
          <Button
            variant={filter === 'interested' ? 'default' : 'outline'}
            onClick={() => setFilter('interested')}
            size="sm"
          >
            Interested
          </Button>
          <Button
            variant={filter === 'not_interested' ? 'default' : 'outline'}
            onClick={() => setFilter('not_interested')}
            size="sm"
          >
            Not Interested
          </Button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="space-y-4">
        {filteredConversations.map((conversation) => (
          <Card key={conversation.id} className={`hover:shadow-md transition-shadow cursor-pointer ${conversation.unread ? 'border-purple-200 bg-purple-50' : ''}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-purple-600">
                        {conversation.contact.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-1">
                      <h3 className={`text-sm font-medium truncate ${conversation.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                        {conversation.contact}
                      </h3>
                      <span className="text-xs text-gray-500">{conversation.company}</span>
                      <Badge className={getStatusColor(conversation.status)} variant="outline">
                        {getStatusIcon(conversation.status)}
                        <span className="ml-1 capitalize">{conversation.status.replace('_', ' ')}</span>
                      </Badge>
                      {conversation.unread && (
                        <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                      )}
                    </div>
                    
                    <p className={`text-sm truncate mb-1 ${conversation.unread ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                      {conversation.subject}
                    </p>
                    
                    <p className="text-sm text-gray-500 truncate">
                      {conversation.preview}
                    </p>
                    
                    <div className="flex items-center text-xs text-gray-400 mt-2">
                      <span>Campaign: {conversation.campaign}</span>
                      <span className="mx-2">•</span>
                      <span>{conversation.timestamp}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <Button variant="outline" size="sm">
                    <Reply className="h-4 w-4 mr-2" />
                    Reply
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Star className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {filteredConversations.length === 0 && (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <InboxIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations found</h3>
              <p className="text-gray-500">
                {searchTerm ? 'Try adjusting your search terms.' : 'Replies to your campaigns will appear here.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function InboxPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <InboxContent />
      </AppLayout>
    </ProtectedRoute>
  )
}