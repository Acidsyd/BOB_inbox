import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import {
  Search,
  MoreHorizontal,
  Edit,
  Eye,
  Trash2,
  TestTube,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { RelayProvider } from '../../hooks/useRelayProviders'

interface RelayProvidersTableProps {
  providers: RelayProvider[]
  onEdit?: (provider: RelayProvider) => void
  onDelete?: (provider: RelayProvider) => void
  onTest?: (provider: RelayProvider) => void
  onViewLinked?: (provider: RelayProvider) => void
}

export function RelayProvidersTable({
  providers,
  onEdit,
  onDelete,
  onTest,
  onViewLinked
}: RelayProvidersTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<{
    key: string | null
    direction: 'asc' | 'desc' | null
  }>({ key: null, direction: null })

  // Filter providers by search term
  const filteredProviders = useMemo(() => {
    if (!searchTerm) return providers

    const term = searchTerm.toLowerCase()
    return providers.filter(provider =>
      provider.provider_name.toLowerCase().includes(term) ||
      provider.provider_type.toLowerCase().includes(term) ||
      provider.config?.domain?.toLowerCase().includes(term)
    )
  }, [providers, searchTerm])

  // Sort providers
  const sortedProviders = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return filteredProviders
    }

    return [...filteredProviders].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortConfig.key) {
        case 'name':
          aValue = a.provider_name.toLowerCase()
          bValue = b.provider_name.toLowerCase()
          break
        case 'type':
          aValue = a.provider_type.toLowerCase()
          bValue = b.provider_type.toLowerCase()
          break
        case 'domain':
          aValue = (a.config?.domain || '').toLowerCase()
          bValue = (b.config?.domain || '').toLowerCase()
          break
        case 'linked':
          aValue = a.linked_accounts_count || 0
          bValue = b.linked_accounts_count || 0
          break
        case 'status':
          aValue = a.is_active ? 1 : 0
          bValue = b.is_active ? 1 : 0
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredProviders, sortConfig])

  // Handle sorting
  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current.key === key) {
        // Cycle through: none → asc → desc → none
        if (current.direction === null) {
          return { key, direction: 'asc' }
        } else if (current.direction === 'asc') {
          return { key, direction: 'desc' }
        } else {
          return { key: null, direction: null }
        }
      } else {
        return { key, direction: 'asc' }
      }
    })
  }

  // Render sort icon
  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) {
      return <ArrowUpDown className="h-4 w-4" />
    }
    return sortConfig.direction === 'asc' ?
      <ArrowUp className="h-4 w-4" /> :
      <ArrowDown className="h-4 w-4" />
  }

  // Get provider type badge color
  const getProviderBadgeColor = (type: string) => {
    switch (type) {
      case 'mailgun': return 'bg-red-100 text-red-800'
      case 'sendgrid': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (providers.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
        <TestTube className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No relay providers configured</h3>
        <p className="text-gray-500 mb-4">
          Add your first Mailgun or SendGrid configuration using the buttons above.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by name or domain..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-600">
          {filteredProviders.length} provider{filteredProviders.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 -ml-3"
                  onClick={() => handleSort('type')}
                >
                  Provider Type
                  <SortIcon column="type" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 -ml-3"
                  onClick={() => handleSort('name')}
                >
                  Provider Name
                  <SortIcon column="name" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 -ml-3"
                  onClick={() => handleSort('domain')}
                >
                  Domain
                  <SortIcon column="domain" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 -ml-3"
                  onClick={() => handleSort('linked')}
                >
                  Linked Accounts
                  <SortIcon column="linked" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 -ml-3"
                  onClick={() => handleSort('status')}
                >
                  Status
                  <SortIcon column="status" />
                </Button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProviders.map((provider) => (
              <TableRow key={provider.id}>
                <TableCell>
                  <Badge className={getProviderBadgeColor(provider.provider_type)}>
                    {provider.provider_type.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{provider.provider_name}</div>
                </TableCell>
                <TableCell>
                  {provider.config?.domain ? (
                    <div className="text-sm">
                      <div>{provider.config.domain}</div>
                      {provider.config.region && (
                        <div className="text-xs text-gray-500">
                          Region: {provider.config.region.toUpperCase()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{provider.linked_accounts_count || 0}</span>
                    {(provider.linked_accounts_count || 0) > 0 && onViewLinked && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewLinked(provider)}
                        className="h-6 px-2"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={provider.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {provider.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(provider)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {onTest && (
                        <DropdownMenuItem onClick={() => onTest(provider)}>
                          <TestTube className="h-4 w-4 mr-2" />
                          Test Connection
                        </DropdownMenuItem>
                      )}
                      {onViewLinked && (provider.linked_accounts_count || 0) > 0 && (
                        <DropdownMenuItem onClick={() => onViewLinked(provider)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Linked Accounts
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem
                          onClick={() => onDelete(provider)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredProviders.length === 0 && searchTerm && (
        <div className="text-center py-8 text-gray-500">
          No providers found matching "{searchTerm}"
        </div>
      )}
    </div>
  )
}
