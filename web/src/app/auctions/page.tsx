'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Search, Filter, Plus, Zap, Clock, Trophy, Archive,
  Globe, Lock, RefreshCw, SortAsc, SortDesc
} from 'lucide-react'
import { AuctionCard } from '@/components/auction/AuctionCard'
import { useAuctions } from '@/hooks/useAuctions'

export default function AuctionsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [visibilityFilter, setVisibilityFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const { auctions, loading, error, pagination, refetch } = useAuctions({
    status: statusFilter,
    visibility: visibilityFilter,
    page: currentPage,
    limit: 12,
    autoRefresh: true // Auto-refresh for live updates
  })

  // Filter auctions based on search query (client-side)
  const filteredAuctions = auctions.filter(auction =>
    auction.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    auction.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    auction.owner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    auction.league?.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusStats = () => {
    const stats = auctions.reduce((acc, auction) => {
      acc[auction.status] = (acc[auction.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      live: stats.LIVE || 0,
      lobby: stats.LOBBY || 0,
      completed: stats.COMPLETED || 0,
      draft: stats.DRAFT || 0,
    }
  }

  const stats = getStatusStats()

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleSort = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Auctions</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Cricket Auctions</h1>
          <p className="text-muted-foreground mt-1">
            Discover and join cricket auctions from around the community
          </p>
        </div>
        <Button asChild>
          <Link href="/auction/create">
            <Plus className="h-4 w-4 mr-2" />
            Create Auction
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center text-red-500 text-2xl font-bold mb-1">
              <Zap className="h-5 w-5 mr-1" />
              {stats.live}
            </div>
            <div className="text-sm text-muted-foreground">Live Now</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center text-yellow-600 text-2xl font-bold mb-1">
              <Clock className="h-5 w-5 mr-1" />
              {stats.lobby}
            </div>
            <div className="text-sm text-muted-foreground">In Lobby</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center text-success text-2xl font-bold mb-1">
              <Trophy className="h-5 w-5 mr-1" />
              {stats.completed}
            </div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center text-muted-foreground text-2xl font-bold mb-1">
              <Archive className="h-5 w-5 mr-1" />
              {stats.draft}
            </div>
            <div className="text-sm text-muted-foreground">Draft</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search auctions, organizers, leagues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="live">🔴 Live</SelectItem>
                <SelectItem value="lobby">🟡 Lobby</SelectItem>
                <SelectItem value="completed">🟢 Completed</SelectItem>
                <SelectItem value="draft">⚫ Draft</SelectItem>
              </SelectContent>
            </Select>

            {/* Visibility Filter */}
            <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="public">
                  <div className="flex items-center">
                    <Globe className="h-4 w-4 mr-2" />
                    Public
                  </div>
                </SelectItem>
                <SelectItem value="private">
                  <div className="flex items-center">
                    <Lock className="h-4 w-4 mr-2" />
                    Private
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Button variant="outline" onClick={toggleSort} className="w-full sm:w-auto">
              {sortDirection === 'asc' ? (
                <SortAsc className="h-4 w-4 mr-2" />
              ) : (
                <SortDesc className="h-4 w-4 mr-2" />
              )}
              Sort
            </Button>

            {/* Refresh */}
            <Button variant="outline" onClick={refetch} className="w-full sm:w-auto">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active filters display */}
      {(statusFilter !== 'all' || visibilityFilter !== 'all' || searchQuery) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {statusFilter !== 'all' && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => setStatusFilter('all')}>
              Status: {statusFilter} ×
            </Badge>
          )}
          {visibilityFilter !== 'all' && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => setVisibilityFilter('all')}>
              {visibilityFilter === 'public' ? 'Public' : 'Private'} ×
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => setSearchQuery('')}>
              Search: {searchQuery} ×
            </Badge>
          )}
        </div>
      )}

      {/* Auctions Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-32 bg-muted" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-8 bg-muted rounded" />
                  <div className="h-8 bg-muted rounded" />
                  <div className="h-8 bg-muted rounded" />
                </div>
                <div className="h-10 bg-muted rounded" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredAuctions.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAuctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!pagination.hasPrev}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {[...Array(pagination.totalPages)].map((_, i) => {
                  const page = i + 1
                  if (
                    page === 1 ||
                    page === pagination.totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Button>
                    )
                  }
                  if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="px-2">...</span>
                  }
                  return null
                })}
              </div>
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!pagination.hasNext}
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card className="p-8 text-center">
          <div className="max-w-md mx-auto">
            <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No auctions found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all' || visibilityFilter !== 'all'
                ? "Try adjusting your filters or search terms."
                : "There are no auctions available at the moment."}
            </p>
            <div className="flex gap-2 justify-center">
              {(searchQuery || statusFilter !== 'all' || visibilityFilter !== 'all') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('')
                    setStatusFilter('all')
                    setVisibilityFilter('all')
                  }}
                >
                  Clear Filters
                </Button>
              )}
              <Button asChild>
                <Link href="/auction/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Auction
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}